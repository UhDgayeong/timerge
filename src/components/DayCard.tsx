import { useEffect, useState } from 'react'
import { effectiveTarget, formatClock, formatMinutes, isWeekend } from '../domain/calc'
import type { DayRecord, Settings } from '../domain/types'

interface Props {
  day: DayRecord
  isToday: boolean
  settings: Settings
  onClick: () => void
  departureInfo?: { clockInMin: number; departureMin: number } | null
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

const TYPE_LABEL: Record<string, string> = {
  work: '근무',
  field: '외근',
  annual: '연차',
  halfday: '반차',
  'halfday-am': '오전반차',
  'halfday-pm': '오후반차',
}


export default function DayCard({ day, isToday, settings, onClick, departureInfo }: Props) {
  const weekend = isWeekend(day.date)
  const target = effectiveTarget(day, settings)
  const fixedTarget = target?.minutes ?? null

  let cardClass = 'day-card'
  if (isToday) cardClass += ' day-card--today'
  if (day.isHoliday) cardClass += ' day-card--holiday'
  else if (weekend) cardClass += ' day-card--weekend'
  else if (day.recognizedMinutes != null) cardClass += ' day-card--done'
  else if (fixedTarget != null) cardClass += ' day-card--fixed'
  else cardClass += ' day-card--pending'

  // 출퇴근 시각: 실적 세그먼트(완전 입력) > 요일 규칙(예정). 출근만 입력된 부분 실적은 별도 처리.
  const workSeg = day.segments.find((s) => s.type === 'work' || s.type === 'field')
  const halfdaySeg = day.segments.find(
    (s) => s.type === 'halfday-am' || s.type === 'halfday-pm' || s.type === 'halfday',
  )

  const isPartialClockIn =
    day.recognizedMinutes == null && workSeg?.startMin != null && workSeg?.endMin == null

  const showElapsed = isToday && departureInfo == null && isPartialClockIn

  const [, tick] = useState(0)
  useEffect(() => {
    if (!showElapsed) return
    const id = setInterval(() => tick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [showElapsed])

  const elapsedStr = showElapsed
    ? (() => {
        const now = new Date()
        const nowMin = now.getHours() * 60 + now.getMinutes()
        const elapsed = nowMin - workSeg!.startMin!
        return elapsed >= 0 ? formatMinutes(elapsed) : null
      })()
    : null

  let timeDisplay: string
  if (day.isHoliday) {
    timeDisplay = '0:00'
  } else if (day.recognizedMinutes != null) {
    timeDisplay = formatMinutes(day.recognizedMinutes)
  } else if (showElapsed) {
    timeDisplay = elapsedStr ?? '미정'
  } else if (fixedTarget != null) {
    timeDisplay = formatMinutes(fixedTarget)
  } else if (weekend) {
    timeDisplay = '-'
  } else {
    timeDisplay = '미정'
  }

  // 타입 라벨: 유니크한 유형만 표시
  const types = [...new Set(day.segments.map((s) => TYPE_LABEL[s.type] ?? s.type))]
  const typeLabel = day.isHoliday
    ? day.holidayName ?? '공휴일'
    : showElapsed
      ? (workSeg?.type === 'field' ? '외근' : '근무') + ' 중'
      : types.length > 0
        ? types.join('+') + (day.recognizedMinutes == null ? ' 예정' : '')
        : fixedTarget != null
          ? '예정'
          : ''

  const isPlannedPreview = day.recognizedMinutes == null && !isPartialClockIn && target?.startMin != null

  const workClockStr = isPartialClockIn
    ? null
    : workSeg?.startMin != null && workSeg?.endMin != null
      ? `${formatClock(workSeg.startMin)}~${formatClock(workSeg.endMin)}`
      : target?.startMin != null
        ? `${formatClock(target.startMin)}~${formatClock(target.endMin!)}`
        : null

  const halfdayClockStr =
    halfdaySeg?.startMin != null && halfdaySeg?.endMin != null
      ? `${formatClock(halfdaySeg.startMin)}~${formatClock(halfdaySeg.endMin)}`
      : null

  const clockDisplay = workClockStr

  const dateNum = (() => {
    const d = new Date(`${day.date}T00:00:00Z`)
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
  })()
  const dowLabel = DOW[new Date(`${day.date}T00:00:00Z`).getUTCDay()]

  return (
    <button type="button" className={cardClass} onClick={onClick}>
      <div className="day-card__row">
        <div className="day-card__date">
          {dateNum}{' '}
          <span className="day-card__date-dow">{dowLabel}</span>
          {isToday && <span className="day-card__today-badge"> · 오늘</span>}
        </div>
        <div className="day-card__right">
          <div className="day-card__time-row">
            {typeLabel && <span className="day-card__label">{typeLabel}</span>}
            <span className="day-card__time">{timeDisplay}</span>
          </div>

          {(clockDisplay || halfdayClockStr) && (
            <div className={`day-card__clock${isPlannedPreview ? ' day-card__clock--planned' : ''}`}>
              {clockDisplay && (
                <div>{halfdayClockStr ? (workSeg?.type === 'field' ? '외근 ' : '근무 ') : ''}{clockDisplay}{isPlannedPreview ? ' 목표' : ''}</div>
              )}
              {halfdayClockStr && (
                <div>{TYPE_LABEL[halfdaySeg!.type] ?? '반차'} {halfdayClockStr}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {departureInfo != null && (
        <div className="day-card__departure">
          {formatClock(departureInfo.clockInMin)} 출근 →{' '}
          <strong>{formatClock(departureInfo.departureMin)} 이후 퇴근 가능</strong>
        </div>
      )}

      {departureInfo == null && isPartialClockIn && (
        <div className="day-card__departure">
          {formatClock(workSeg!.startMin!)} 출근
        </div>
      )}
    </button>
  )
}
