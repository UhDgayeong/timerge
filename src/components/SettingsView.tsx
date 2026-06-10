import { useEffect, useRef, useState } from 'react'
import type { BackupData } from '../db/index'
import {
  exportBackup,
  getSettings,
  importBackup,
  reassignWeeksOnDefault,
  saveSettings,
} from '../db/index'

interface Props {
  onClose: () => void
}

/** defaultBaseGoalMinutes(분) → 시간 문자열. 정수면 "40", 아니면 "37.5" */
function minToHours(min: number): string {
  return String(min / 60)
}

/** 백업 JSON을 파일로 내려받는다 (웹) */
function downloadJson(data: BackupData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date(data.exportedAt).toISOString().slice(0, 10)
  a.href = url
  a.download = `timerge-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 파싱된 객체가 BackupData 형태인지 최소 검증 */
function isBackupData(v: unknown): v is BackupData {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  return (
    d.version === 1 &&
    Array.isArray(d.weeks) &&
    Array.isArray(d.days) &&
    Array.isArray(d.holidayOverrides) &&
    typeof d.settings === 'object' &&
    d.settings !== null
  )
}

export default function SettingsView({ onClose }: Props) {
  const [hours, setHours] = useState('')
  const [originalDefault, setOriginalDefault] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then((s) => {
      setOriginalDefault(s.defaultBaseGoalMinutes)
      setHours(minToHours(s.defaultBaseGoalMinutes))
    })
  }, [])

  async function handleSaveGoal() {
    const h = Number(hours)
    if (!Number.isFinite(h) || h <= 0) {
      setStatus('올바른 시간을 입력하세요')
      return
    }
    const newDefault = Math.round(h * 60)
    setBusy(true)
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, defaultBaseGoalMinutes: newDefault })
      const moved =
        originalDefault != null ? await reassignWeeksOnDefault(originalDefault, newDefault) : 0
      setOriginalDefault(newDefault)
      setStatus(
        moved > 0
          ? `저장됨 · 기존 ${moved}개 주에도 적용`
          : '저장됨 · 새로 만드는 주부터 적용',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleBackup() {
    setBusy(true)
    try {
      downloadJson(await exportBackup())
      setStatus('백업 파일을 내려받았습니다')
    } finally {
      setBusy(false)
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일 다시 선택 가능하게
    if (!file) return
    setBusy(true)
    setStatus('')
    try {
      const parsed = JSON.parse(await file.text())
      if (!isBackupData(parsed)) {
        setStatus('백업 파일 형식이 올바르지 않습니다')
        return
      }
      const ok = window.confirm(
        '백업을 복원하면 같은 날짜·주의 현재 기록을 덮어씁니다. 계속할까요?',
      )
      if (!ok) {
        setStatus('')
        return
      }
      await importBackup(parsed)
      setStatus('복원 완료 — 주간 화면으로 돌아가면 반영됩니다')
    } catch {
      setStatus('파일을 읽지 못했습니다 (JSON 아님)')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings">
      <header className="settings__header">
        <button className="settings__back" onClick={onClose} aria-label="뒤로">
          ‹
        </button>
        <h2 className="settings__title">설정</h2>
      </header>

      <section className="settings__section">
        <h3 className="settings__section-title">기본 주간 목표</h3>
        <p className="settings__hint">5일 만근 기준 목표 시간. 공휴일이 있는 주는 자동으로 −8시간.</p>
        <div className="settings__row">
          <input
            className="settings__input"
            type="number"
            inputMode="decimal"
            min={1}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <span className="settings__unit">시간 / 주</span>
          <button className="btn btn--primary settings__save" onClick={handleSaveGoal} disabled={busy}>
            저장
          </button>
        </div>
      </section>

      <section className="settings__section">
        <h3 className="settings__section-title">데이터</h3>
        <p className="settings__hint">모든 기록을 JSON 파일로 백업하거나 복원합니다.</p>
        <div className="settings__row settings__row--data">
          <button className="btn btn--ghost settings__data-btn" onClick={handleBackup} disabled={busy}>
            ⬇ 백업 내려받기
          </button>
          <button
            className="btn btn--ghost settings__data-btn"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            ⬆ 복원하기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleRestoreFile}
          />
        </div>
      </section>

      {status && <p className="settings__status">{status}</p>}
    </div>
  )
}
