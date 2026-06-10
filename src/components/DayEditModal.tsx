import { useState } from 'react'
import type { DayRecord, Segment, SegmentType, Settings } from '../domain/types'
import { formatMinutes, parseClock, recognizedFromSegments } from '../domain/calc'
import { setHolidayOverride, upsertDay } from '../db/index'

interface Props {
  day: DayRecord
  settings: Settings
  onClose: () => void
  onSaved: () => void
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

const TYPE_OPTIONS: { value: SegmentType; label: string }[] = [
  { value: 'work', label: '근무' },
  { value: 'field', label: '외근' },
  { value: 'annual', label: '연차' },
  { value: 'halfday', label: '반차' },
]

/** 시각 입력이 필요한 유형 (연차는 종일 고정이라 시각 불필요) */
function needsTime(type: SegmentType): boolean {
  return type !== 'annual'
}

interface EditSegment {
  type: SegmentType
  start: string // "HH:MM" or ""
  end: string
}

function toEditSegment(s: Segment): EditSegment {
  return {
    type: s.type,
    start: s.startMin != null ? minToClock(s.startMin) : '',
    end: s.endMin != null ? minToClock(s.endMin) : '',
  }
}

function minToClock(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function toSegment(es: EditSegment): Segment {
  return {
    type: es.type,
    startMin: es.start ? parseClock(es.start) : null,
    endMin: es.end ? parseClock(es.end) : null,
  }
}

function formatDateTitle(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${DOW[d.getUTCDay()]})`
}

export default function DayEditModal({ day, settings, onClose, onSaved }: Props) {
  const [isHoliday, setIsHoliday] = useState(day.isHoliday)
  const [holidayName, setHolidayName] = useState(day.holidayName ?? '')
  const [segments, setSegments] = useState<EditSegment[]>(
    day.segments.length > 0
      ? day.segments.map(toEditSegment)
      : [{ type: 'work', start: '', end: '' }],
  )
  const [saving, setSaving] = useState(false)

  // 라이브 인정시간 미리보기
  const liveRecognized = recognizedFromSegments(
    segments.map(toSegment),
    settings.lunchMinutes,
  )
  const hasInput = segments.some((s) => {
    if (s.type === 'annual') return true
    if (s.type === 'halfday') return true
    return s.start !== '' && s.end !== ''
  })

  function updateSegment(idx: number, patch: Partial<EditSegment>) {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  function addSegment() {
    setSegments((prev) => [...prev, { type: 'work', start: '', end: '' }])
  }

  function removeSegment(idx: number) {
    setSegments((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (isHoliday) {
        await setHolidayOverride(day.date, true, holidayName || undefined)
        await upsertDay({
          ...day,
          recognizedMinutes: null,
          isHoliday: true,
          holidayName: holidayName || null,
          segments: [],
          source: 'manual',
        })
      } else {
        // 공휴일 해제 시 override도 해제
        if (day.isHoliday) await setHolidayOverride(day.date, false)
        const segs = segments.map(toSegment)
        await upsertDay({
          ...day,
          recognizedMinutes: hasInput ? recognizedFromSegments(segs, settings.lunchMinutes) : null,
          isHoliday: false,
          holidayName: null,
          segments: hasInput ? segs : [],
          source: 'manual',
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    setSaving(true)
    try {
      if (day.isHoliday) await setHolidayOverride(day.date, false)
      await upsertDay({
        ...day,
        recognizedMinutes: null,
        isHoliday: false,
        holidayName: null,
        segments: [],
        source: 'manual',
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{formatDateTitle(day.date)}</h2>
          <button className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <label className="modal__holiday">
          <input
            type="checkbox"
            checked={isHoliday}
            onChange={(e) => setIsHoliday(e.target.checked)}
          />
          공휴일
        </label>

        {isHoliday ? (
          <input
            className="modal__holiday-name"
            type="text"
            placeholder="공휴일 이름 (예: 현충일)"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
          />
        ) : (
          <>
            <div className="modal__segments">
              {segments.map((seg, idx) => (
                <div className="seg-row" key={idx}>
                  <select
                    className="seg-row__type"
                    value={seg.type}
                    onChange={(e) =>
                      updateSegment(idx, { type: e.target.value as SegmentType })
                    }
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  {needsTime(seg.type) ? (
                    <>
                      <input
                        className="seg-row__time"
                        type="time"
                        value={seg.start}
                        onChange={(e) => updateSegment(idx, { start: e.target.value })}
                      />
                      <span className="seg-row__tilde">~</span>
                      <input
                        className="seg-row__time"
                        type="time"
                        value={seg.end}
                        onChange={(e) => updateSegment(idx, { end: e.target.value })}
                      />
                    </>
                  ) : (
                    <span className="seg-row__fixed">종일 (8시간)</span>
                  )}

                  {segments.length > 1 && (
                    <button
                      className="seg-row__remove"
                      onClick={() => removeSegment(idx)}
                      aria-label="구간 삭제"
                    >
                      −
                    </button>
                  )}
                </div>
              ))}
              <button className="modal__add-seg" onClick={addSegment}>
                + 구간 추가
              </button>
            </div>

            <div className="modal__preview">
              인정시간 <strong>{hasInput ? formatMinutes(liveRecognized) : '—'}</strong>
            </div>
          </>
        )}

        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={handleClear} disabled={saving}>
            기록 지우기
          </button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
