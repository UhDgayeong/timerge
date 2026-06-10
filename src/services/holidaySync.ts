import { db } from '../db/index'
import { staticHolidaysForYear, type HolidayBase } from '../data/holidays'

const CALENDAR_ID = 'ko.south_korea#holiday@group.v.calendar.google.com'
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string

/** 캐시 유효 기간 30일 */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

// ── Google Calendar API ──────────────────────────────────────────

interface GCalEvent {
  summary: string
  start: { date?: string; dateTime?: string }
}

interface GCalResponse {
  items: GCalEvent[]
  nextPageToken?: string
}

async function fetchFromGoogleCalendar(year: number): Promise<HolidayBase[]> {
  const timeMin = `${year}-01-01T00:00:00Z`
  const timeMax = `${year}-12-31T23:59:59Z`
  const calendarId = encodeURIComponent(CALENDAR_ID)

  const results: HolidayBase[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      key: API_KEY,
      timeMin,
      timeMax,
      singleEvents: 'true',
      maxResults: '100',
      ...(pageToken ? { pageToken } : {}),
    })

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
    )
    if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`)

    const data: GCalResponse = await res.json()
    for (const item of data.items) {
      const date = item.start.date
      if (date) results.push({ date, name: item.summary })
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return results
}

// ── DB 캐시 ──────────────────────────────────────────────────────

async function getCachedHolidays(year: number): Promise<HolidayBase[] | null> {
  const entries = await db.holidayCache.where('year').equals(year).toArray()
  if (entries.length === 0) return null

  const isStale = entries.some((e) => Date.now() - e.syncedAt > CACHE_TTL_MS)
  if (isStale) return null

  return entries.map(({ date, name }) => ({ date, name }))
}

async function setCachedHolidays(year: number, holidays: HolidayBase[]): Promise<void> {
  const syncedAt = Date.now()
  await db.transaction('rw', db.holidayCache, async () => {
    await db.holidayCache.where('year').equals(year).delete()
    await db.holidayCache.bulkAdd(holidays.map((h) => ({ ...h, year, syncedAt })))
  })
}

// ── 공개 API ─────────────────────────────────────────────────────

/**
 * 해당 연도의 공휴일 목록을 반환한다.
 * 우선순위: DB 캐시(30일) → Google Calendar API → 정적 fallback
 */
export async function getHolidaysForYear(year: number): Promise<HolidayBase[]> {
  const cached = await getCachedHolidays(year)
  if (cached) return cached

  try {
    const fresh = await fetchFromGoogleCalendar(year)
    await setCachedHolidays(year, fresh)
    return fresh
  } catch {
    return staticHolidaysForYear(year)
  }
}

/**
 * 백그라운드 동기화. 앱 시작 시 호출 — 실패해도 조용히 무시.
 * 이미 캐시가 유효하면 건너뜀.
 */
export async function syncHolidaysInBackground(years: number[]): Promise<void> {
  for (const year of years) {
    const cached = await getCachedHolidays(year)
    if (cached) continue

    fetchFromGoogleCalendar(year)
      .then((data) => setCachedHolidays(year, data))
      .catch(() => {/* 네트워크 없어도 조용히 */})
  }
}

/**
 * 특정 날짜가 공휴일인지 확인한다 (HolidayOverride 적용 포함).
 * HolidayOverride가 있으면 그 값이 최우선.
 */
export async function resolveHoliday(
  date: string,
): Promise<{ isHoliday: boolean; name: string | null }> {
  const override = await db.holidayOverrides.get(date)
  if (override !== undefined) {
    return { isHoliday: override.isHoliday, name: override.name ?? null }
  }

  const year = Number(date.slice(0, 4))
  const holidays = await getHolidaysForYear(year)
  const found = holidays.find((h) => h.date === date)
  return found ? { isHoliday: true, name: found.name } : { isHoliday: false, name: null }
}
