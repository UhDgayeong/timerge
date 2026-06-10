import { formatMinutes, isWorkableDay } from '../domain/calc'
import type { WeekSummary } from '../domain/calc'
import type { DayRecord, WeekRecord } from '../domain/types'

interface Props {
  week: WeekRecord
  summary: WeekSummary
  days: DayRecord[]
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']

function utcDow(dateStr: string): string {
  return DOW[new Date(`${dateStr}T00:00:00Z`).getUTCDay()]
}

function weekRangeLabel(startDate: string, endDate: string): string {
  const s = new Date(`${startDate}T00:00:00Z`)
  const e = new Date(`${endDate}T00:00:00Z`)
  return `${s.getUTCMonth() + 1}.${s.getUTCDate()} ~ ${e.getUTCMonth() + 1}.${e.getUTCDate()}`
}

export default function WeekHeader({ week, summary, days }: Props) {
  const { goalMinutes, totalRecognizedMinutes, remainingMinutes, overtimeMinutes, avgNeededPerPendingDay } =
    summary

  const isOvertime = overtimeMinutes > 0
  const isDone = !isOvertime && remainingMinutes <= 0

  const pendingDayNames = days
    .filter((d) => isWorkableDay(d) && d.recognizedMinutes == null && d.fixedTargetMinutes == null)
    .map((d) => utcDow(d.date))

  return (
    <div className="week-header">
      <div className="week-header__range">{weekRangeLabel(week.startDate, week.endDate)}</div>

      <div className="week-header__main">
        <span className="week-header__accumulated">{formatMinutes(totalRecognizedMinutes)}</span>
        <span className="week-header__sep"> / 목표 </span>
        <span className="week-header__goal">{formatMinutes(goalMinutes)}</span>
        {!isOvertime && remainingMinutes > 0 && (
          <>
            <span className="week-header__sep"> · 남은 </span>
            <span className="week-header__remaining">{formatMinutes(remainingMinutes)}</span>
          </>
        )}
      </div>

      {isOvertime && (
        <span className="week-header__overtime">{formatMinutes(overtimeMinutes)} 초과</span>
      )}

      {isDone && (
        <div className="week-header__done">목표 달성 ✓</div>
      )}

      {!isDone && avgNeededPerPendingDay != null && pendingDayNames.length > 0 && (
        <div className="week-header__avg">
          {pendingDayNames.join('·')} · 평균{' '}
          <strong>{formatMinutes(Math.ceil(avgNeededPerPendingDay))}</strong>씩
        </div>
      )}
    </div>
  )
}
