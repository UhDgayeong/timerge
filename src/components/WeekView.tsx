import { useMemo } from 'react'
import { currentWeekMonday } from '../db/index'
import { useWeekData } from '../hooks/useWeekData'
import DayCard from './DayCard'
import WeekHeader from './WeekHeader'

function localTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function WeekView() {
  const monday = useMemo(() => currentWeekMonday(), [])
  const today = useMemo(() => localTodayStr(), [])
  const { data, loading } = useWeekData(monday)

  if (loading || !data) {
    return <div className="week-view__loading">불러오는 중...</div>
  }

  const { week, days, summary } = data

  return (
    <div className="week-view">
      <WeekHeader week={week} summary={summary} days={days} />
      <div className="day-list">
        {days.map((day) => (
          <DayCard key={day.id} day={day} isToday={day.date === today} />
        ))}
      </div>
    </div>
  )
}
