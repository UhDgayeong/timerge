import { useState } from 'react'
import TimePicker from './TimePicker'
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
  { value: 'halfday-am', label: '오전반차' },
  { value: 'halfday-pm', label: '오후반차' },
]

/** 시각 입력이 필요한 유형 (연차는 종일 고정이라 시각 불필요) */
function needsTime(type: SegmentType): boolean {
  return type !== 'annual'
}

/** 휴게 체크박스 표시 여부 */
function showsLunchCheckbox(type: SegmentType): boolean {
  return type !== 'annual'
}

/** 유형별 휴게 차감 디폴트 */
function defaultLunchExcluded(type: SegmentType): boolean {
  return type === 'work' || type === 'field' || type === 'halfday-am'
}

interface EditSegment {
  type: SegmentType
  start: string // "HH:MM" or ""
  end: string
  lunchExcluded: boolean
}

function toEditSegment(s: Segment): EditSegment {
  // 레거시 halfday → halfday-am으로 표시
  const type = s.type === 'halfday' ? 'halfday-am' : s.type
  return {
    type,
    start: s.startMin != null ? minToClock(s.startMin) : '',
    end: s.endMin != null ? minToClock(s.endMin) : '',
    lunchExcluded: s.lunchExcluded ?? defaultLunchExcluded(type),
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
    lunchExcluded: es.lunchExcluded,
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
      : [{ type: 'work', start: '', end: '', lunchExcluded: true }],
  )
  // 계획 목표(요일 규칙 또는 이번 주 수동값)를 시간 문자열로 프리필
  const [targetHours, setTargetHours] = useState(
    minToHoursStr(effectiveFixedTarget(day, settings)),
  )
  const [saving, setSaving] = useState(false)
  const [activePicker, setActivePicker] = useState<{ segIdx: number; field: 'start' | 'end' } | null>(null)

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
  // 완전 입력: 인정시간 계산 가능 (출퇴근 둘 다, 또는 연차/반차)
  const hasCompleteInput = segments.some((s) => {
    if (s.type === 'annual') return true
    if (s.type === 'halfday') return true
    return s.start !== '' && s.end !== ''
  })
  // 부분 입력: 출근만 입력된 상태 (역산용 메타데이터로 보존)
  const hasPartialInput = !hasCompleteInput && segments.some((s) => s.start !== '')
  const hasInput = hasCompleteInput || hasPartialInput

  function updateSegment(idx: number, patch: Partial<EditSegment>) {
    setSegments((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s
        const next = { ...s, ...patch }
        // 유형 변경 시 lunchExcluded 디폴트 재설정 (명시적으로 넘기지 않은 경우)
        if (patch.type !== undefined && patch.lunchExcluded === undefined) {
          next.lunchExcluded = defaultLunchExcluded(patch.type)
        }
        return next
      }),
    )
  }

  function addSegment() {
    setSegments((prev) => [...prev, { type: 'work', start: '', end: '', lunchExcluded: true }])
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
      } else if (hasCompleteInput) {
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
      } else if (hasPartialInput) {
        // 출근만 입력 → segments 보존(역산용), recognizedMinutes는 null 유지
        if (day.isHoliday) await setHolidayOverride(day.date, false)
        const segs = segments.map(toSegment)
        await upsertDay({
          ...day,
          recognizedMinutes: null,
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
        <div className="modal__handle" />
        <div className="modal__header">
          <h2 className="modal__title">{formatDateTitle(day.date)}</h2>
          <button className="modal__close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <label className="modal__holiday">
          <input
            type="checkbox"
            className="modal__checkbox"
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
                <div className="seg-block" key={idx}>
                  <div className="seg-row">
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
                        <button
                          type="button"
                          className={`time-pill${!seg.start ? ' time-pill--empty' : ''}`}
                          onClick={() => setActivePicker({ segIdx: idx, field: 'start' })}
                        >
                          <span>{seg.start || '--:--'}</span>
                          <span className="time-pill__chevron" />
                        </button>
                        <span className="seg-row__tilde">~</span>
                        <button
                          type="button"
                          className={`time-pill${!seg.end ? ' time-pill--empty' : ''}`}
                          onClick={() => setActivePicker({ segIdx: idx, field: 'end' })}
                        >
                          <span>{seg.end || '--:--'}</span>
                          <span className="time-pill__chevron" />
                        </button>
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

                  {showsLunchCheckbox(seg.type) && (
                    <label className="seg-row__lunch">
                      <input
                        type="checkbox"
                        className="modal__checkbox"
                        style={{ width: '20px', height: '20px', borderRadius: '6px' }}
                        checked={seg.lunchExcluded}
                        onChange={(e) =>
                          updateSegment(idx, { lunchExcluded: e.target.checked })
                        }
                      />
                      휴게 1시간 제외
                    </label>
                  )}
                </div>
              ))}
              <button className="modal__add-seg" onClick={addSegment}>
                + 구간 추가
              </button>
            </div>

            <div className="modal__preview">
              인정시간 <strong>{hasCompleteInput ? formatMinutes(liveRecognized) : hasPartialInput ? '퇴근 입력 후 계산' : '—'}</strong>
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

      {activePicker && (
        <TimePicker
          label={activePicker.field === 'start' ? '시작 시간' : '종료 시간'}
          value={segments[activePicker.segIdx]?.[activePicker.field] ?? ''}
          onConfirm={(val) => {
            updateSegment(activePicker.segIdx, { [activePicker.field]: val })
            setActivePicker(null)
          }}
          onCancel={() => setActivePicker(null)}
        />
      )}
    </div>
  )
}
