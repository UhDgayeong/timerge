import { effectiveTarget, formatClock, formatMinutes, isWeekend, wasLunchDeducted } from '../domain/calc'
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
  'halfday-am': '오전반차',
  'halfday-pm': '오후반차',
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
    showLunchBadge = wasLunchDeducted(day.segments)
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
  const halfdaySeg = day.segments.find(
    (s) => s.type === 'halfday-am' || s.type === 'halfday-pm' || s.type === 'halfday',
  )

  const workClockStr =
    target?.startMin != null
      ? `${formatClock(target.startMin)}~${formatClock(target.endMin!)}`
      : workSeg?.startMin != null && workSeg?.endMin != null
        ? `${formatClock(workSeg.startMin)}~${formatClock(workSeg.endMin)}`
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
        {showLunchBadge && <span className="day-card__lunch-badge">휴게 1h 제외</span>}
        {(clockDisplay || halfdayClockStr) && (
          <div className="day-card__clock">
            {clockDisplay && (
              <div>{halfdayClockStr ? (workSeg?.type === 'field' ? '외근 ' : '근무 ') : ''}{clockDisplay}</div>
            )}
            {halfdayClockStr && (
              <div>{TYPE_LABEL[halfdaySeg!.type] ?? '반차'} {halfdayClockStr}</div>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
