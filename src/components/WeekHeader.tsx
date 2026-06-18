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
  // remainingMinutes = goal - recognized - totalFixed (마지막 날 고정목표 포함).
  // 퇴근 역산은 "마지막 날에 얼마나 일해야 하나"이므로, 마지막 날 자신의 고정목표를 다시 더한다.
  const lastDayFixed = lastDay != null ? (effectiveFixedTarget(lastDay, settings) ?? 0) : 0
  const departureInfo =
    lastDay != null
      ? calcLastDayDeparture(lastDay, summary.remainingMinutes + lastDayFixed, settings.lunchMinutes)
      : null

  const plannedDays = days
    .filter((d) => d.recognizedMinutes == null)
    .map((d) => ({ d, target: effectiveTarget(d, settings) }))
    .filter((x): x is { d: DayRecord; target: NonNullable<ReturnType<typeof effectiveTarget>> } => x.target != null)

  return (
    <div className="week-header">
      <div className="week-header__range">{weekRangeLabel(week.startDate, week.endDate)}</div>

      <div className="week-header__main">
        {(() => {
          const fmt = formatMinutes(totalRecognizedMinutes)
          const numPart = fmt.replace(/[^0-9:]/g, '').trim() || fmt
          const unitPart = fmt.replace(numPart, '').trim()
          return (
            <>
              <span className="week-header__accumulated">{numPart}</span>
              {unitPart && <span className="week-header__unit">{unitPart}</span>}
            </>
          )
        })()}
        <span className="week-header__sep">
          목표 <strong className="week-header__goal">{formatMinutes(goalMinutes)}</strong>
          {!isOvertime && goalMinutes - totalRecognizedMinutes > 0 && (
            <> · 남은 <strong className="week-header__remaining">{formatMinutes(goalMinutes - totalRecognizedMinutes)}</strong></>
          )}
        </span>
      </div>

      <div className="week-header__progress">
        <div
          className="week-header__progress-fill"
          style={{ width: `${goalMinutes > 0 ? Math.min(100, Math.round((totalRecognizedMinutes / goalMinutes) * 100)) : 0}%` }}
        />
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
