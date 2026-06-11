import { calcLastDayDeparture, effectiveFixedTarget, effectiveTarget, formatClock, formatMinutes, isWorkableDay, lastWorkableDay } from '../domain/calc'
import type { WeekSummary } from '../domain/calc'
import type { DayRecord, Settings, WeekRecord } from '../domain/types'

interface Props {
  week: WeekRecord
  summary: WeekSummary
  days: DayRecord[]
  settings: Settings
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

export default function WeekHeader({ week, summary, days, settings }: Props) {
  const { goalMinutes, totalRecognizedMinutes, remainingMinutes, overtimeMinutes, avgNeededPerPendingDay } =
    summary

  const isOvertime = overtimeMinutes > 0
  const isDone = !isOvertime && remainingMinutes <= 0

  const pendingDayNames = days
    .filter(
      (d) =>
        isWorkableDay(d) &&
        d.recognizedMinutes == null &&
        effectiveFixedTarget(d, settings) == null,
    )
    .map((d) => utcDow(d.date))

  // 계획(고정목표)이 걸린 미실적 평일 — "금 10:00~15:00 · 4시간" 식으로 안내
  // 마지막 근무일 퇴근 역산
  const lastDay = lastWorkableDay(days)
  const departureInfo =
    lastDay != null
      ? calcLastDayDeparture(lastDay, summary.remainingMinutes, settings.lunchMinutes)
      : null

  const plannedDays = days
    .filter((d) => d.recognizedMinutes == null)
    .map((d) => ({ d, target: effectiveTarget(d, settings) }))
    .filter((x): x is { d: DayRecord; target: NonNullable<ReturnType<typeof effectiveTarget>> } => x.target != null)

  return (
    <div className="week-header">
      <div className="week-header__range">{weekRangeLabel(week.startDate, week.endDate)}</div>

      <div className="week-header__main">
        <span className="week-header__accumulated">{formatMinutes(totalRecognizedMinutes)}</span>
        <span className="week-header__sep"> / 목표 </span>
        <span className="week-header__goal">{formatMinutes(goalMinutes)}</span>
        {!isOvertime && goalMinutes - totalRecognizedMinutes > 0 && (
          <>
            <span className="week-header__sep"> · 남은 </span>
            <span className="week-header__remaining">{formatMinutes(goalMinutes - totalRecognizedMinutes)}</span>
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

      {departureInfo != null && (
        <div className="week-header__departure">
          {lastDay && utcDow(lastDay.date)}요일{' '}
          {formatClock(departureInfo.clockInMin)} 출근 →{' '}
          <strong>{formatClock(departureInfo.departureMin)} 이후 퇴근 가능</strong>
        </div>
      )}

      {plannedDays.length > 0 && (
        <div className="week-header__planned">
          {plannedDays
            .map(({ d, target }) => {
              const clock =
                target.startMin != null
                  ? ` ${formatClock(target.startMin)}~${formatClock(target.endMin!)}`
                  : ''
              return `${utcDow(d.date)}${clock} · ${formatMinutes(target.minutes)}`
            })
            .join(' / ')}{' '}
          예정
        </div>
      )}
    </div>
  )
}
