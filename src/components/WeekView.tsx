import { useMemo, useState } from 'react'
import { addDays, currentWeekMonday } from '../db/index'
import { useWeekData } from '../hooks/useWeekData'
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

  return (
    <div className="week-view">
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
            {data.days.map((day) => (
              <DayCard
                key={day.id}
                day={day}
                isToday={day.date === today}
                settings={data.settings}
                onClick={() => setEditDay(day)}
              />
            ))}
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
