import { useEffect, useState } from 'react'
import { fetchSharedWeek } from '../services/share'
import type { SharedWeekData } from '../services/share'
import { summarizeWeek } from '../domain/calc'
import { DEFAULTS } from '../domain/types'
import type { DayRecord, Settings, WeekRecord } from '../domain/types'
import WeekHeader from './WeekHeader'
import DayCard from './DayCard'
import logoMark from '../assets/logo-mark.svg'

interface Props {
  token: string
}

function toDayRecord(d: SharedWeekData['days'][number], weekId: string): DayRecord {
  return {
    id: d.id,
    weekId,
    date: d.date,
    recognizedMinutes: d.recognized_minutes,
    fixedTargetMinutes: d.fixed_target_minutes,
    fixedTargetManual: d.fixed_target_manual,
    isHoliday: d.is_holiday,
    holidayName: d.holiday_name,
    segments: (d.segments as DayRecord['segments']) ?? [],
    source: 'manual',
    updatedAt: 0,
  }
}

function localTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function SharedWeekView({ token }: Props) {
  const [state, setState] = useState<'loading' | 'notfound' | 'empty' | 'ready'>('loading')
  const [data, setData] = useState<SharedWeekData | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  useEffect(() => {
    fetchSharedWeek(token).then((res) => {
      if (!res || !res.week) {
        setState(res ? 'empty' : 'notfound')
        setData(res)
        return
      }
      setData(res)
      setState('ready')
    })
  }, [token])

  if (state === 'loading') {
    return <div className="share-page share-page--center">불러오는 중...</div>
  }

  if (state === 'notfound') {
    return (
      <div className="share-page share-page--center">
        <p>링크를 찾을 수 없어요. 링크가 만료되었거나 잘못됐을 수 있어요.</p>
      </div>
    )
  }

  if (state === 'empty' || !data?.week) {
    return (
      <div className="share-page share-page--center">
        <p>{data?.displayName ? `${data.displayName}님의 ` : ''}아직 등록된 근무 기록이 없어요.</p>
      </div>
    )
  }

  const week: WeekRecord = {
    id: data.week.id,
    startDate: data.week.startDate,
    endDate: data.week.endDate,
    baseGoalMinutes: data.week.baseGoalMinutes,
    updatedAt: 0,
  }
  const days = data.days.map((d) => toDayRecord(d, week.id))
  const settings: Settings = {
    ...DEFAULTS,
    ...(data.settings ?? {}),
  }
  const summary = summarizeWeek(week, days, settings)
  const today = localTodayStr()

  return (
    <div className="share-page">
      <header className="share-page__header">
        <img src={logoMark} alt="" className="app-header__logo" />
        <span className="share-page__title">
          {data.displayName ? `${data.displayName}님의 근무 현황` : '근무 현황'}
        </span>
      </header>
      <div className="share-page__body">
        <WeekHeader week={week} summary={summary} days={days} settings={settings} />
        <div className="day-list">
          {days.map((day) => (
            <DayCard key={day.id} day={day} isToday={day.date === today} settings={settings} onClick={() => {}} />
          ))}
        </div>
      </div>
      <p className="share-page__footer">Timerge에서 공유된 화면입니다.</p>
    </div>
  )
}
