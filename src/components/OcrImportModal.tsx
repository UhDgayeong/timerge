import { useEffect, useRef, useState } from 'react'
import type { DayRecord } from '../domain/types'
import { formatMinutes } from '../domain/calc'
import { addDays, setHolidayOverride, upsertDay } from '../db/index'
import { mergeOcrResults, ocrImage, parseFlexText } from '../services/flexOcr'
import type { OcrDay } from '../services/flexOcr'
import { pushBackHandler } from '../lib/backHandler'

interface Props {
  monday: string
  days: DayRecord[]
  onClose: () => void
  onSaved: () => void
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

/** OcrDay에 표시/편집용 필드 추가 */
interface ReviewRow extends OcrDay {
  date: string
  dow: string
  // 사용자가 편집할 수 있는 인정시간 (분)
  editedMinutes: string
  editedHolidayName: string
  skip: boolean
}

function dayNumToDate(monday: string, month: number, dayOfMonth: number): string | null {
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i)
    const [, m, day] = d.split('-').map(Number)
    if (m === month && day === dayOfMonth) return d
  }
  return null
}

/** "9:42" → 582분. 잘못된 형식이면 null */
function parseHhMm(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const m1 = t.match(/^(\d{1,2}):(\d{2})$/)
  if (m1) return parseInt(m1[1]) * 60 + parseInt(m1[2])
  // 숫자만 입력 시 분으로 해석
  const m2 = t.match(/^(\d+)$/)
  if (m2) return parseInt(m2[1])
  return null
}

export default function OcrImportModal({ monday, days, onClose, onSaved }: Props) {
  useEffect(() => pushBackHandler(onClose), [onClose])

  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<'upload' | 'processing' | 'review'>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<{ idx: number; pct: number }>({ idx: 0, pct: 0 })
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  async function handleStart() {
    if (files.length === 0) return
    setPhase('processing')
    setError(null)

    try {
      const results = []
      for (let i = 0; i < files.length; i++) {
        setProgress({ idx: i, pct: 0 })
        const text = await ocrImage(files[i], (pct) => setProgress({ idx: i, pct }))
        results.push(parseFlexText(text))
      }

      const merged = mergeOcrResults(results)

      if (merged.month === null) {
        setError('주 범위를 찾지 못했습니다. 스크린샷 상단의 날짜(예: 6.1 - 6.7)가 포함됐는지 확인해주세요.')
        setPhase('upload')
        return
      }

      const daysMap = new Map(days.map((d) => [d.date, d]))
      const newRows: ReviewRow[] = []

      for (const ocrDay of merged.days) {
        const date = dayNumToDate(monday, merged.month, ocrDay.dayOfMonth)
        if (!date) continue // 이 주에 없는 날짜

        const existing = daysMap.get(date)
        if (!existing) continue

        const d = new Date(`${date}T00:00:00Z`)
        newRows.push({
          ...ocrDay,
          date,
          dow: DOW[d.getUTCDay()],
          editedMinutes:
            ocrDay.recognizedMinutes != null
              ? `${Math.floor(ocrDay.recognizedMinutes / 60)}:${String(ocrDay.recognizedMinutes % 60).padStart(2, '0')}`
              : '',
          editedHolidayName: ocrDay.holidayName ?? '',
          skip: false,
        })
      }

      if (newRows.length === 0) {
        setError('이 주에 해당하는 날짜 데이터를 찾지 못했습니다. 현재 주와 맞는 스크린샷인지 확인해주세요.')
        setPhase('upload')
        return
      }

      setRows(newRows)
      setPhase('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR 중 오류가 발생했습니다.')
      setPhase('upload')
    }
  }

  function updateRow(idx: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const daysMap = new Map(days.map((d) => [d.date, d]))

      for (const row of rows) {
        if (row.skip) continue
        const existing = daysMap.get(row.date)
        if (!existing) continue

        if (row.isHoliday) {
          const name = row.editedHolidayName.trim() || undefined
          await setHolidayOverride(row.date, true, name)
          await upsertDay({
            ...existing,
            recognizedMinutes: null,
            isHoliday: true,
            holidayName: name ?? null,
            segments: [],
            source: 'ocr',
          })
        } else {
          const mins = parseHhMm(row.editedMinutes)
          if (mins === null) continue // 입력 없으면 건너뜀
          if (existing.isHoliday) await setHolidayOverride(row.date, false)
          await upsertDay({
            ...existing,
            recognizedMinutes: mins,
            isHoliday: false,
            holidayName: null,
            segments: row.segments,
            source: 'ocr',
          })
        }
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--ocr" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">FLEX 스크린샷으로 입력</h2>
          <button className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {phase === 'upload' && (
          <div className="ocr-upload">
            <p className="ocr-upload__hint">
              FLEX 주간 화면 스크린샷을 선택하세요.
              <br />
              한 번에 여러 장 또는 순차 추가 가능합니다.
            </p>

            <label className="ocr-upload__btn">
              + 이미지 추가
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>

            {files.length > 0 && (
              <ul className="ocr-upload__list">
                {files.map((f, i) => (
                  <li key={i} className="ocr-upload__item">
                    <span>📷 {f.name}</span>
                    <button
                      className="ocr-upload__remove"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="ocr-upload__error">{error}</p>}

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={onClose}>
                취소
              </button>
              <button
                className="btn btn--primary"
                disabled={files.length === 0}
                onClick={handleStart}
              >
                인식 시작
              </button>
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="ocr-progress">
            <p>
              이미지 {progress.idx + 1} / {files.length} 인식 중…
            </p>
            <div className="ocr-progress__bar">
              <div
                className="ocr-progress__fill"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <p className="ocr-progress__pct">{progress.pct}%</p>
            <p className="ocr-progress__note">처음 실행 시 언어팩 다운로드로 1분 정도 걸릴 수 있습니다.</p>
          </div>
        )}

        {phase === 'review' && (
          <div className="ocr-review">
            <p className="ocr-review__hint">
              인식 결과를 확인하고 필요하면 수정하세요. ⚠️ 는 배지를 읽지 못한 날입니다.
            </p>

            <table className="ocr-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>인정시간</th>
                  <th>건너뜀</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.date} className={row.skip ? 'ocr-table__row--skip' : ''}>
                    <td className="ocr-table__date">
                      {row.dow} {row.date.slice(5).replace('-', '/')}
                    </td>
                    <td className="ocr-table__val">
                      {row.isHoliday ? (
                        <span className="ocr-table__holiday">
                          공휴일{row.editedHolidayName ? ` · ${row.editedHolidayName}` : ''}
                        </span>
                      ) : (
                        <div className="ocr-table__input-wrap">
                          {row.recognizedMinutes == null && (
                            <span className="ocr-table__warn" title="배지를 읽지 못했습니다">⚠️</span>
                          )}
                          <input
                            className="ocr-table__input"
                            type="text"
                            inputMode="numeric"
                            placeholder="H:MM"
                            value={row.editedMinutes}
                            disabled={row.skip}
                            onChange={(e) => updateRow(i, { editedMinutes: e.target.value })}
                          />
                          {row.editedMinutes && parseHhMm(row.editedMinutes) != null && (
                            <span className="ocr-table__preview">
                              = {formatMinutes(parseHhMm(row.editedMinutes)!)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.skip}
                        onChange={(e) => updateRow(i, { skip: e.target.checked })}
                        title="이 날 건너뜀"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setPhase('upload')}>
                다시 선택
              </button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
