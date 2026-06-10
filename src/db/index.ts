import Dexie, { type Table } from 'dexie'
import { DEFAULTS } from '../domain/types'
import type { DayRecord, WeekRecord, Settings } from '../domain/types'

export interface HolidayOverride {
  /** primary key "2026-05-25" */
  date: string
  isHoliday: boolean
  name?: string
  updatedAt: number
}

/** Google Calendar API로 받아온 공휴일 캐시 */
export interface HolidayCacheEntry {
  /** primary key "2026-05-25" */
  date: string
  name: string
  /** 연도별 일괄 조회용 인덱스 */
  year: number
  /** 이 연도 전체를 마지막으로 동기화한 시각 */
  syncedAt: number
}

type SettingsRecord = Settings & { id: 1 }

class TimergeDB extends Dexie {
  weeks!: Table<WeekRecord>
  days!: Table<DayRecord>
  holidayOverrides!: Table<HolidayOverride>
  holidayCache!: Table<HolidayCacheEntry>
  settings!: Table<SettingsRecord>

  constructor() {
    super('timerge')
    this.version(1).stores({
      weeks: 'id, startDate',
      days: 'id, weekId, date',
      holidayOverrides: 'date',
      settings: 'id',
    })
    this.version(2).stores({
      holidayCache: 'date, year',
    })
  }
}

export const db = new TimergeDB()

// ── 날짜/주 유틸 ──────────────────────────────────────────────────

/** "2026-05-25"(월요일) → "2026-W22" (ISO 주번호) */
export function toWeekId(mondayDate: string): string {
  const d = new Date(`${mondayDate}T00:00:00Z`)
  const year = d.getUTCFullYear()
  // ISO 1번 주의 목요일 기준: 1월 4일이 항상 1번 주에 포함
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Dow = jan4.getUTCDay() || 7
  const jan4Monday = new Date(jan4.getTime() - (jan4Dow - 1) * 86_400_000)
  const week = Math.round((d.getTime() - jan4Monday.getTime()) / (7 * 86_400_000)) + 1
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** 오늘이 속하는 주의 월요일 날짜 "YYYY-MM-DD" (로컬 시각 기준) */
export function currentWeekMonday(): string {
  const now = new Date()
  const dow = now.getDay() || 7 // 일=7
  now.setDate(now.getDate() - (dow - 1))
  return now.toISOString().slice(0, 10)
}

/** 월요일 날짜로부터 일요일 날짜 */
export function mondayToSunday(mondayDate: string): string {
  const d = new Date(`${mondayDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}

/** "YYYY-MM-DD" + N일 → "YYYY-MM-DD" */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ── Week CRUD ─────────────────────────────────────────────────────

export async function getWeek(id: string): Promise<WeekRecord | undefined> {
  return db.weeks.get(id)
}

/**
 * 해당 월요일의 주를 가져오거나, 없으면 기본 목표로 생성한다.
 * baseGoalMinutes를 명시하면 새로 만들 때만 적용(기존 기록 유지).
 */
export async function getOrCreateWeek(
  mondayDate: string,
  baseGoalMinutes?: number,
): Promise<WeekRecord> {
  const id = toWeekId(mondayDate)
  const existing = await db.weeks.get(id)
  if (existing) return existing

  const settings = await getSettings()
  const week: WeekRecord = {
    id,
    startDate: mondayDate,
    endDate: mondayToSunday(mondayDate),
    baseGoalMinutes: baseGoalMinutes ?? settings.defaultBaseGoalMinutes,
    updatedAt: Date.now(),
  }
  await db.weeks.put(week)
  return week
}

export async function updateWeekGoal(id: string, baseGoalMinutes: number): Promise<void> {
  await db.weeks.update(id, { baseGoalMinutes, updatedAt: Date.now() })
}

// ── Day CRUD ──────────────────────────────────────────────────────

export async function getDaysForWeek(weekId: string): Promise<DayRecord[]> {
  return db.days.where('weekId').equals(weekId).sortBy('date')
}

export async function upsertDay(day: DayRecord): Promise<void> {
  await db.days.put({ ...day, updatedAt: Date.now() })
}

export async function deleteDay(id: string): Promise<void> {
  await db.days.delete(id)
}

// ── HolidayOverride CRUD ──────────────────────────────────────────

export async function getHolidayOverride(date: string): Promise<HolidayOverride | undefined> {
  return db.holidayOverrides.get(date)
}

export async function setHolidayOverride(
  date: string,
  isHoliday: boolean,
  name?: string,
): Promise<void> {
  await db.holidayOverrides.put({ date, isHoliday, name, updatedAt: Date.now() })
}

export async function getAllHolidayOverrides(): Promise<HolidayOverride[]> {
  return db.holidayOverrides.toArray()
}

// ── Settings ──────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const record = await db.settings.get(1)
  if (!record) return { ...DEFAULTS }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...settings } = record
  return settings
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ ...settings, id: 1 })
}

// ── JSON 백업/복원 ────────────────────────────────────────────────

export interface BackupData {
  version: 1
  exportedAt: number
  weeks: WeekRecord[]
  days: DayRecord[]
  holidayOverrides: HolidayOverride[]
  settings: Settings
}

export async function exportBackup(): Promise<BackupData> {
  const [weeks, days, holidayOverrides, settings] = await Promise.all([
    db.weeks.toArray(),
    db.days.toArray(),
    db.holidayOverrides.toArray(),
    getSettings(),
  ])
  return { version: 1, exportedAt: Date.now(), weeks, days, holidayOverrides, settings }
}

export async function importBackup(data: BackupData): Promise<void> {
  await db.transaction('rw', [db.weeks, db.days, db.holidayOverrides, db.settings], async () => {
    await db.weeks.bulkPut(data.weeks)
    await db.days.bulkPut(data.days)
    await db.holidayOverrides.bulkPut(data.holidayOverrides)
    await saveSettings(data.settings)
  })
}
