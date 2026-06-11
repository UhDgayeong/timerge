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

  const isCurrentWeek = monday === thisMonday

  return (
    <div className="week-view">
      <nav className="week-nav">
        <button
          className="week-nav__btn"
          onClick={() => setMonday((m) => addDays(m, -7))}
          aria-label="이전 주"
        >
          ‹
        </button>
        {isCurrentWeek ? (
          <span className="week-nav__label">이번 주</span>
        ) : (
          <button className="week-nav__today" onClick={() => setMonday(thisMonday)}>
            오늘로
          </button>
        )}
        <button
          className="week-nav__btn"
          onClick={() => setMonday((m) => addDays(m, 7))}
          aria-label="다음 주"
        >
          ›
        </button>
      </nav>

      {loading || !data ? (
        <div className="week-view__loading">불러오는 중...</div>
      ) : (
        <>
          <WeekHeader
            week={data.week}
            summary={data.summary}
            days={data.days}
            settings={data.settings}
          />
          <div className="week-view__ocr-row">
            <button className="btn btn--ocr" onClick={() => setShowOcr(true)}>
              📷 스크린샷으로 입력
            </button>
          </div>
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
        </>
      )}
    </div>
  )
}
