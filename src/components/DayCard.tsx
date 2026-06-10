import { effectiveTarget, formatClock, formatMinutes, isWeekend } from '../domain/calc'
import type { DayRecord, Settings } from '../domain/types'

interface Props {
  day: DayRecord
  isToday: boolean
  settings: Settings
  onClick: () => void
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

const TYPE_LABEL: Record<string, string> = {
  work: '근무',
  field: '외근',
  annual: '연차',
  halfday: '반차',
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  const dow = DOW[d.getUTCDay()]
  return `${m}/${day} ${dow}`
}

export default function DayCard({ day, isToday, settings, onClick }: Props) {
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

  let timeDisplay: string
  let showLunchBadge = false
  if (day.isHoliday) {
    timeDisplay = '0:00'
  } else if (day.recognizedMinutes != null) {
    timeDisplay = formatMinutes(day.recognizedMinutes)
    showLunchBadge = true
  } else if (fixedTarget != null) {
    timeDisplay = formatMinutes(fixedTarget)
    showLunchBadge = true
  } else if (weekend) {
    timeDisplay = '-'
  } else {
    timeDisplay = '미정'
  }

  // 타입 라벨: 유니크한 유형만 표시
  const types = [...new Set(day.segments.map((s) => TYPE_LABEL[s.type] ?? s.type))]
  const typeLabel = day.isHoliday
    ? day.holidayName ?? '공휴일'
    : types.length > 0
      ? types.join('+')
      : fixedTarget != null
        ? '예정'
        : ''

  // 출퇴근 시각: 요일 규칙(예정) > 실적 세그먼트
  const workSeg = day.segments.find((s) => s.type === 'work' || s.type === 'field')
  const clockDisplay =
    target?.startMin != null
      ? `${formatClock(target.startMin)}~${formatClock(target.endMin!)}`
      : workSeg?.startMin != null && workSeg?.endMin != null
        ? `${formatClock(workSeg.startMin)}~${formatClock(workSeg.endMin)}`
        : null

  return (
    <button type="button" className={cardClass} onClick={onClick}>
      <div className="day-card__date">{formatDateLabel(day.date)}</div>
      <div className="day-card__body">
        <span className="day-card__time">{timeDisplay}</span>
        {showLunchBadge && <span className="day-card__lunch-badge">휴게 1시간 제외</span>}
        {typeLabel && <span className="day-card__label">{typeLabel}</span>}
      </div>
      {clockDisplay && <div className="day-card__clock">{clockDisplay}</div>}
    </button>
  )
}
