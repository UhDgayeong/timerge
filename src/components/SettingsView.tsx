import { useEffect, useRef, useState } from 'react'
import AuthSection from './AuthSection'
import type { BackupData } from '../db/index'
import {
  exportBackup,
  getSettings,
  importBackup,
  reassignWeeksOnDefault,
  saveSettings,
} from '../db/index'
import { parseClock, formatClock, recognizedFromSegments } from '../domain/calc'

interface Props {
  onClose: () => void
}

/** 요일 규칙 대상 — 월~금 (getUTCDay 기준 1=월 … 5=금) */
const WEEKDAYS: { wd: number; label: string }[] = [
  { wd: 1, label: '월' },
  { wd: 2, label: '화' },
  { wd: 3, label: '수' },
  { wd: 4, label: '목' },
  { wd: 5, label: '금' },
]

/** defaultBaseGoalMinutes(분) → 시간 문자열. 정수면 "40", 아니면 "37.5" */
function minToHours(min: number): string {
  return String(min / 60)
}

/** 자정 기준 분 → "HH:MM" */
function minToClock(min: number): string {
  return formatClock(min)
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
  // 요일별 목표: 요일→출퇴근 시각 문자열 ('' = 규칙 없음)
  const [wdTimes, setWdTimes] = useState<Record<number, { start: string; end: string }>>({})

  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSettings().then((s) => {
      setOriginalDefault(s.defaultBaseGoalMinutes)
      setHours(minToHours(s.defaultBaseGoalMinutes))
      const init: Record<number, { start: string; end: string }> = {}
      for (const { wd } of WEEKDAYS) {
        const rule = s.weekdayTargets?.[wd]
        init[wd] =
          rule?.startMin != null
            ? { start: minToClock(rule.startMin), end: minToClock(rule.endMin) }
            : { start: '', end: '' }
      }
      setWdTimes(init)
    })
  }, [])

  async function handleSaveWeekdays() {
    const targets: Record<number, { startMin: number; endMin: number }> = {}
    for (const { wd } of WEEKDAYS) {
      const t = wdTimes[wd] ?? { start: '', end: '' }
      if (!t.start && !t.end) continue
      if (!t.start || !t.end) {
        setStatus('출근·퇴근 시각을 모두 입력하세요')
        return
      }
      targets[wd] = { startMin: parseClock(t.start), endMin: parseClock(t.end) }
    }
    setBusy(true)
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, weekdayTargets: targets })
      const count = Object.keys(targets).length
      setStatus(count > 0 ? `요일 목표 ${count}개 저장됨` : '요일 목표 모두 해제됨')
    } finally {
      setBusy(false)
    }
  }

  /** 해당 요일의 출퇴근 규칙으로 인정시간 미리보기 */
  function wdPreview(wd: number): string {
    const t = wdTimes[wd] ?? { start: '', end: '' }
    if (!t.start || !t.end) return ''
    try {
      const mins = recognizedFromSegments(
        [{ type: 'work', startMin: parseClock(t.start), endMin: parseClock(t.end) }],
        60,
      )
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
    } catch {
      return ''
    }
  }

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

      <div className="settings__scroll">
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
        <h3 className="settings__section-title">요일별 목표</h3>
        <p className="settings__hint">
          특정 요일에 매주 적용할 목표시간. 비워두면 그 요일은 평소대로 자동 배분(미정).
          그 주만 다르게 하려면 홈에서 그 날을 눌러 수정하세요.
        </p>
        <div className="settings__weekdays">
          {WEEKDAYS.map(({ wd, label }) => {
            const t = wdTimes[wd] ?? { start: '', end: '' }
            const preview = wdPreview(wd)
            return (
              <div className="settings__wd-row" key={wd}>
                <span className="settings__wd-label">{label}</span>
                <input
                  className="settings__input settings__wd-time"
                  type="time"
                  value={t.start}
                  onChange={(e) =>
                    setWdTimes((prev) => ({ ...prev, [wd]: { ...t, start: e.target.value } }))
                  }
                />
                <span className="settings__wd-tilde">~</span>
                <input
                  className="settings__input settings__wd-time"
                  type="time"
                  value={t.end}
                  onChange={(e) =>
                    setWdTimes((prev) => ({ ...prev, [wd]: { ...t, end: e.target.value } }))
                  }
                />
                {preview && <span className="settings__wd-preview">{preview}</span>}
                {(t.start || t.end) && (
                  <button
                    className="settings__wd-clear"
                    onClick={() =>
                      setWdTimes((prev) => ({ ...prev, [wd]: { start: '', end: '' } }))
                    }
                    title="이 요일 목표 삭제"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <button
          className="btn btn--primary settings__wd-save"
          onClick={handleSaveWeekdays}
          disabled={busy}
        >
          요일 목표 저장
        </button>
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

      <section className="settings__section">
        <h3 className="settings__section-title">계정 및 동기화</h3>
        <AuthSection />
      </section>

      {status && <p className="settings__status">{status}</p>}
      </div>
    </div>
  )
}
