import { useMemo, useRef, useState } from 'react'
import { addDays, currentWeekMonday } from '../db/index'
import { useWeekData } from '../hooks/useWeekData'
import { calcLastDayDeparture, effectiveFixedTarget, isWorkableDay, lastWorkableDay } from '../domain/calc'
import type { DayRecord } from '../domain/types'
import DayCard from './DayCard'
import DayEditModal from './DayEditModal'
import OcrImportModal from './OcrImportModal'
import WeekHeader from './WeekHeader'

function localTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function WeekView() {
  const thisMonday = useMemo(() => currentWeekMonday(), [])
  const today = useMemo(() => localTodayStr(), [])
  const [monday, setMonday] = useState(thisMonday)
  const { data, loading, reload } = useWeekData(monday)
  const [editDay, setEditDay] = useState<DayRecord | null>(null)
  const [showOcr, setShowOcr] = useState(false)
  const [slideKey, setSlideKey] = useState(0)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const isCurrentWeek = monday === thisMonday

  function goToPrevWeek() {
    setSlideDir('left')
    setSlideKey((k) => k + 1)
    setMonday((m) => addDays(m, -7))
  }

  function goToNextWeek() {
    setSlideDir('right')
    setSlideKey((k) => k + 1)
    setMonday((m) => addDays(m, 7))
  }

  function goToToday() {
    setSlideDir(monday > thisMonday ? 'left' : 'right')
    setSlideKey((k) => k + 1)
    setMonday(thisMonday)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      if (dx < 0) goToNextWeek()
      else goToPrevWeek()
    }
  }

  return (
    <div className="week-view" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <nav className="week-nav">
        <button
          className="week-nav__btn"
          onClick={goToPrevWeek}
          aria-label="이전 주"
        >
          ‹
        </button>
        {isCurrentWeek ? (
          <span className="week-nav__label">이번 주</span>
        ) : (
          <button className="week-nav__today" onClick={goToToday}>
            오늘로
          </button>
        )}
        <button
          className="week-nav__btn"
          onClick={goToNextWeek}
          aria-label="다음 주"
        >
          ›
        </button>
      </nav>

      {loading || !data ? (
        <div className="week-view__loading">불러오는 중...</div>
      ) : (
        <div
          key={slideKey}
          className={`week-content${slideDir ? ` week-content--slide-${slideDir}` : ''}`}
        >
          <WeekHeader
            week={data.week}
            summary={data.summary}
            days={data.days}
            settings={data.settings}
          />
          <div className="day-list">
            {(() => {
              const lastDay = lastWorkableDay(data.days)
              // 마지막 근무일을 제외한 나머지 근무가능일이 모두 실적(recognizedMinutes) 입력된 상태여야
              // remainingMinutes가 추정이 아닌 확정값이 되어 퇴근 역산이 의미를 가진다.
              const priorDaysConfirmed =
                lastDay != null &&
                data.days
                  .filter((d) => d.id !== lastDay.id && isWorkableDay(d))
                  .every((d) => d.recognizedMinutes != null)
              return data.days.map((day) => {
                let departureInfo = null
                if (lastDay != null && day.id === lastDay.id && priorDaysConfirmed) {
                  // remainingMinutes = goal - recognized - totalFixed (마지막 날 고정목표 포함).
                  // 퇴근 역산은 "마지막 날에 얼마나 일해야 하나"이므로, 마지막 날 자신의 고정목표를 다시 더한다.
                  const lastDayFixed = effectiveFixedTarget(lastDay, data.settings) ?? 0
                  departureInfo = calcLastDayDeparture(
                    lastDay,
                    data.summary.remainingMinutes + lastDayFixed,
                    data.settings.lunchMinutes,
                  )
                }
                return (
                  <DayCard
                    key={day.id}
                    day={day}
                    isToday={day.date === today}
                    settings={data.settings}
                    onClick={() => setEditDay(day)}
                    departureInfo={departureInfo}
                  />
                )
              })
            })()}
          </div>
          <div className="week-view__ocr-row">
            <button className="btn--ocr" onClick={() => setShowOcr(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2.5" y="6.5" width="19" height="13" rx="3.5" stroke="var(--accent)" strokeWidth="1.8" />
                <circle cx="12" cy="13" r="3.6" stroke="var(--accent)" strokeWidth="1.8" />
                <rect x="8" y="4" width="8" height="3" rx="1.5" fill="var(--accent)" />
              </svg>
              스크린샷으로 입력
            </button>
          </div>

          {editDay && (
            <DayEditModal
              day={editDay}
              settings={data.settings}
              onClose={() => setEditDay(null)}
              onSaved={() => {
                setEditDay(null)
                reload()
              }}
            />
          )}

          {showOcr && (
            <OcrImportModal
              monday={monday}
              days={data.days}
              onClose={() => setShowOcr(false)}
              onSaved={() => {
                setShowOcr(false)
                reload()
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
