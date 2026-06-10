import { useState } from 'react'
import type { DayRecord, Segment, SegmentType, Settings } from '../domain/types'
import {
  effectiveFixedTarget,
  formatMinutes,
  isWeekend,
  parseClock,
  recognizedFromSegments,
} from '../domain/calc'
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

/** 분 → 시간 문자열(입력칸용). null/0이면 '' */
function minToHoursStr(min: number | null): string {
  return min != null ? String(min / 60) : ''
}

/** 시간 문자열 → 분(정수). 빈칸·잘못된 값이면 null */
function hoursStrToMin(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const h = Number(t)
  if (!Number.isFinite(h) || h <= 0) return null
  return Math.round(h * 60)
}

export default function DayEditModal({ day, settings, onClose, onSaved }: Props) {
  const [isHoliday, setIsHoliday] = useState(day.isHoliday)
  const [holidayName, setHolidayName] = useState(day.holidayName ?? '')
  const [segments, setSegments] = useState<EditSegment[]>(
    day.segments.length > 0
      ? day.segments.map(toEditSegment)
      : [{ type: 'work', start: '', end: '' }],
  )
  // 계획 목표(요일 규칙 또는 이번 주 수동값)를 시간 문자열로 프리필
  const [targetHours, setTargetHours] = useState(
    minToHoursStr(effectiveFixedTarget(day, settings)),
  )
  const [saving, setSaving] = useState(false)

  const isWeekday = !isWeekend(day.date)
  const wd = new Date(`${day.date}T00:00:00Z`).getUTCDay()
  const wdRule = settings.weekdayTargets?.[wd] ?? null
  // 요일 규칙의 인정시간(분). 출퇴근 시각 → recognizedFromSegments로 계산
  const ruleMinutes =
    wdRule?.startMin != null
      ? recognizedFromSegments(
          [{ type: 'work', startMin: wdRule.startMin, endMin: wdRule.endMin }],
          settings.lunchMinutes,
        )
      : null

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
      } else if (hasInput) {
        // 실적 입력 → recognizedMinutes 채움. 계획 목표 필드는 그대로 보존(...day)
        if (day.isHoliday) await setHolidayOverride(day.date, false)
        const segs = segments.map(toSegment)
        await upsertDay({
          ...day,
          recognizedMinutes: recognizedFromSegments(segs, settings.lunchMinutes),
          isHoliday: false,
          holidayName: null,
          segments: segs,
          source: 'manual',
        })
      } else {
        // 실적 없음 → 계획 목표(이번 주 한정 override) 적용
        if (day.isHoliday) await setHolidayOverride(day.date, false)
        const entered = isWeekday ? hoursStrToMin(targetHours) : null
        let fixedTargetMinutes: number | null
        let fixedTargetManual: boolean
        if (entered === ruleMinutes) {
          // 규칙값과 같음(둘 다 null 포함) → 규칙을 그대로 따름
          fixedTargetMinutes = null
          fixedTargetManual = false
        } else if (entered == null) {
          // 규칙은 있는데 이번 주 이 날만 비움 → 미정 처리
          fixedTargetMinutes = null
          fixedTargetManual = true
        } else {
          // 이번 주 이 날만 다른 값으로 덮어씀
          fixedTargetMinutes = entered
          fixedTargetManual = false
        }
        await upsertDay({
          ...day,
          recognizedMinutes: null,
          isHoliday: false,
          holidayName: null,
          segments: [],
          source: 'manual',
          fixedTargetMinutes,
          fixedTargetManual,
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
        fixedTargetMinutes: null,
        fixedTargetManual: false,
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

            {isWeekday && !hasInput && (
              <div className="modal__plan">
                <label className="modal__plan-label">이 날 목표시간 (계획)</label>
                <div className="modal__plan-row">
                  <input
                    className="modal__plan-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    placeholder="미정"
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                  />
                  <span className="modal__plan-unit">시간</span>
                </div>
                <p className="modal__plan-hint">
                  {ruleMinutes != null
                    ? `요일 규칙: ${formatMinutes(ruleMinutes)} · 비우면 이번 주만 해제`
                    : '실적을 입력하면 목표는 무시됩니다'}
                </p>
              </div>
            )}
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
