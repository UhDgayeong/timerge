import { useState, useEffect, useCallback } from 'react'
import type { DayRecord, Settings, WeekRecord } from '../domain/types'
import type { WeekSummary } from '../domain/calc'
import { summarizeWeek } from '../domain/calc'
import {
  addDays,
  getDaysForWeek,
  getOrCreateWeek,
  getSettings,
  upsertDay,
} from '../db/index'
import { resolveHoliday, syncHolidaysInBackground } from '../services/holidaySync'

export interface WeekData {
  week: WeekRecord
  days: DayRecord[]
  settings: Settings
  summary: WeekSummary
}

export function useWeekData(mondayDate: string) {
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const year = Number(mondayDate.slice(0, 4))
      syncHolidaysInBackground([year, year + 1])

      const [week, settings] = await Promise.all([
        getOrCreateWeek(mondayDate),
        getSettings(),
      ])

      const existingDays = await getDaysForWeek(week.id)
      const existingByDate = new Map(existingDays.map((d) => [d.date, d]))

      // 없는 날짜 7개 중 빈 것만 병렬로 공휴일 조회
      const dateRange = Array.from({ length: 7 }, (_, i) => addDays(mondayDate, i))
      const missingDates = dateRange.filter((d) => !existingByDate.has(d))

      const resolved = await Promise.all(
        missingDates.map(async (date) => {
          const { isHoliday, name } = await resolveHoliday(date)
          return { date, isHoliday, name }
        }),
      )

      const newStubs: DayRecord[] = resolved.map(({ date, isHoliday, name }) => ({
        id: `${week.id}-${date}`,
        weekId: week.id,
        date,
        recognizedMinutes: null,
        fixedTargetMinutes: null,
        isHoliday,
        holidayName: name,
        segments: [],
        source: 'manual' as const,
        updatedAt: Date.now(),
      }))

      if (newStubs.length > 0) {
        await Promise.all(newStubs.map(upsertDay))
        for (const stub of newStubs) existingByDate.set(stub.date, stub)
      }

      const allDays = dateRange.map((d) => existingByDate.get(d)!)

      if (!cancelled) {
        setData({
          week,
          days: allDays,
          settings,
          summary: summarizeWeek(week, allDays, settings),
        })
        setLoading(false)
      }
    }

    load().catch(console.error)
    return () => {
      cancelled = true
    }
  }, [mondayDate, version])

  return { data, loading, reload }
}
