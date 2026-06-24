import { useEffect, useRef, useState } from 'react'
import { effectiveFixedTarget, effectiveTarget, formatClock, formatMinutes, isWorkableDay } from '../domain/calc'
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

  const [showHelp, setShowHelp] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showHelp) return
    const onOutside = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setShowHelp(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [showHelp])

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
  const plannedDays = days
    .filter((d) => d.recognizedMinutes == null)
    .map((d) => ({ d, target: effectiveTarget(d, settings) }))
    .filter((x): x is { d: DayRecord; target: NonNullable<ReturnType<typeof effectiveTarget>> } => x.target != null)

  return (
    <div className="week-header">
      <div className="week-header__glow" />
      <div className="week-header__help" ref={helpRef}>
        <button
          type="button"
          className="week-header__help-btn"
          aria-label="안내"
          onClick={() => setShowHelp((v) => !v)}
        >
          ?
        </button>
        {showHelp && (
          <div className="week-header__help-bubble">
            <p>
              <strong>평균 ○시간씩</strong> — 남은 평일에 매일 이만큼씩 일하면 목표 시간을 채울 수 있어요.
            </p>
          </div>
        )}
      </div>
      <div className="week-header__range">{weekRangeLabel(week.startDate, week.endDate)}</div>

      <div className="week-header__main">
        {(() => {
          const fmt = formatMinutes(totalRecognizedMinutes)
          const match = fmt.match(/^(\d+)(.*)/)
          const numPart = match ? match[1] : fmt
          const unitPart = match ? match[2].trim() : ''
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
            <> · 남은 시간 <strong className="week-header__remaining">{formatMinutes(goalMinutes - totalRecognizedMinutes)}</strong></>
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
