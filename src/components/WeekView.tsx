import { useMemo, useState } from 'react'
import { currentWeekMonday } from '../db/index'
import { useWeekData } from '../hooks/useWeekData'
import type { DayRecord } from '../domain/types'
import DayCard from './DayCard'
import DayEditModal from './DayEditModal'
import WeekHeader from './WeekHeader'

function localTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function WeekView() {
  const monday = useMemo(() => currentWeekMonday(), [])
  const today = useMemo(() => localTodayStr(), [])
  const { data, loading, reload } = useWeekData(monday)
  const [editDay, setEditDay] = useState<DayRecord | null>(null)

  if (loading || !data) {
    return <div className="week-view__loading">불러오는 중...</div>
  }

  const { week, days, summary, settings } = data

  return (
    <div className="week-view">
      <WeekHeader week={week} summary={summary} days={days} />
      <div className="day-list">
        {days.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            isToday={day.date === today}
            onClick={() => setEditDay(day)}
          />
        ))}
      </div>

      {editDay && (
        <DayEditModal
          day={editDay}
          settings={settings}
          onClose={() => setEditDay(null)}
          onSaved={() => {
            setEditDay(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
