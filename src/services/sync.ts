import { supabase } from '../lib/supabase'
import { db, getSettings, saveSettings } from '../db/index'
import type { DayRecord, WeekRecord, Settings } from '../domain/types'
import type { HolidayOverride } from '../db/index'

// ── 헬퍼 ─────────────────────────────────────────────────────────

function userId(): Promise<string | null> {
  return supabase.auth.getUser().then(({ data }) => data.user?.id ?? null)
}

// ── weeks ─────────────────────────────────────────────────────────

async function syncWeeks(uid: string) {
  const local = await db.weeks.toArray()

  // 서버에서 최신 rows 가져오기
  const { data: remote } = await supabase
    .from('weeks')
    .select('*')
    .eq('user_id', uid)

  const remoteMap = new Map((remote ?? []).map((r: RemoteWeek) => [r.id, r]))

  const toUpsertRemote: RemoteWeek[] = []
  const toUpsertLocal: WeekRecord[] = []

  // 로컬 기준 비교
  for (const loc of local) {
    const rem = remoteMap.get(loc.id)
    if (!rem || loc.updatedAt > rem.updated_at) {
      toUpsertRemote.push(weekToRemote(loc, uid))
    } else if (rem.updated_at > loc.updatedAt) {
      toUpsertLocal.push(remoteToWeek(rem))
    }
    remoteMap.delete(loc.id)
  }

  // 서버에만 있는 rows → 로컬에 추가
  for (const rem of remoteMap.values()) {
    toUpsertLocal.push(remoteToWeek(rem))
  }

  if (toUpsertRemote.length) {
    await supabase.from('weeks').upsert(toUpsertRemote)
  }
  if (toUpsertLocal.length) {
    await db.weeks.bulkPut(toUpsertLocal)
  }
}

interface RemoteWeek {
  id: string
  user_id: string
  start_date: string
  end_date: string
  base_goal_minutes: number
  updated_at: number
}

function weekToRemote(w: WeekRecord, uid: string): RemoteWeek {
  return {
    id: w.id,
    user_id: uid,
    start_date: w.startDate,
    end_date: w.endDate,
    base_goal_minutes: w.baseGoalMinutes,
    updated_at: w.updatedAt,
  }
}

function remoteToWeek(r: RemoteWeek): WeekRecord {
  return {
    id: r.id,
    startDate: r.start_date,
    endDate: r.end_date,
    baseGoalMinutes: r.base_goal_minutes,
    updatedAt: r.updated_at,
  }
}

// ── days ──────────────────────────────────────────────────────────

async function syncDays(uid: string) {
  const local = await db.days.toArray()

  const { data: remote } = await supabase
    .from('days')
    .select('*')
    .eq('user_id', uid)

  const remoteMap = new Map((remote ?? []).map((r: RemoteDay) => [r.id, r]))

  const toUpsertRemote: RemoteDay[] = []
  const toUpsertLocal: DayRecord[] = []

  for (const loc of local) {
    const rem = remoteMap.get(loc.id)
    if (!rem || loc.updatedAt > rem.updated_at) {
      toUpsertRemote.push(dayToRemote(loc, uid))
    } else if (rem.updated_at > loc.updatedAt) {
      toUpsertLocal.push(remoteToDay(rem))
    }
    remoteMap.delete(loc.id)
  }

  for (const rem of remoteMap.values()) {
    toUpsertLocal.push(remoteToDay(rem))
  }

  if (toUpsertRemote.length) {
    await supabase.from('days').upsert(toUpsertRemote)
  }
  if (toUpsertLocal.length) {
    await db.days.bulkPut(toUpsertLocal)
  }
}

interface RemoteDay {
  id: string
  user_id: string
  week_id: string
  date: string
  recognized_minutes: number | null
  fixed_target_minutes: number | null
  fixed_target_manual: boolean
  is_holiday: boolean
  holiday_name: string | null
  segments: DayRecord['segments']
  source: string
  updated_at: number
}

function dayToRemote(d: DayRecord, uid: string): RemoteDay {
  return {
    id: d.id,
    user_id: uid,
    week_id: d.weekId,
    date: d.date,
    recognized_minutes: d.recognizedMinutes,
    fixed_target_minutes: d.fixedTargetMinutes,
    fixed_target_manual: d.fixedTargetManual ?? false,
    is_holiday: d.isHoliday,
    holiday_name: d.holidayName,
    segments: d.segments,
    source: d.source,
    updated_at: d.updatedAt,
  }
}

function remoteToDay(r: RemoteDay): DayRecord {
  return {
    id: r.id,
    weekId: r.week_id,
    date: r.date,
    recognizedMinutes: r.recognized_minutes,
    fixedTargetMinutes: r.fixed_target_minutes,
    fixedTargetManual: r.fixed_target_manual,
    isHoliday: r.is_holiday,
    holidayName: r.holiday_name,
    segments: r.segments,
    source: r.source as DayRecord['source'],
    updatedAt: r.updated_at,
  }
}

// ── settings ──────────────────────────────────────────────────────

async function syncSettings(uid: string) {
  const local = await getSettings()
  const localUpdatedAt = await db.settings.get(1).then(s => s ? (s as any).updatedAt ?? 0 : 0)

  const { data: remote } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()

  if (!remote || localUpdatedAt >= remote.updated_at) {
    // 로컬이 최신 → 서버에 올림
    await supabase.from('settings').upsert({
      user_id: uid,
      default_base_goal_minutes: local.defaultBaseGoalMinutes,
      daily_standard_minutes: local.dailyStandardMinutes,
      lunch_minutes: local.lunchMinutes,
      weekday_targets: local.weekdayTargets,
      core_time_start: local.coreTimeStart,
      core_time_end: local.coreTimeEnd,
      share_token: local.shareToken ?? null,
      share_display_name: local.shareDisplayName ?? null,
      updated_at: localUpdatedAt || Date.now(),
    })
  } else {
    // 서버가 최신 → 로컬에 적용
    const merged: Settings = {
      defaultBaseGoalMinutes: remote.default_base_goal_minutes,
      dailyStandardMinutes: remote.daily_standard_minutes,
      lunchMinutes: remote.lunch_minutes,
      weekdayTargets: remote.weekday_targets,
      coreTimeStart: remote.core_time_start,
      coreTimeEnd: remote.core_time_end,
      shareToken: remote.share_token ?? null,
      shareDisplayName: remote.share_display_name ?? null,
    }
    await saveSettings(merged)
  }
}

// ── holiday_overrides ─────────────────────────────────────────────

async function syncHolidayOverrides(uid: string) {
  const local = await db.holidayOverrides.toArray()

  const { data: remote } = await supabase
    .from('holiday_overrides')
    .select('*')
    .eq('user_id', uid)

  const remoteMap = new Map((remote ?? []).map((r: RemoteHolidayOverride) => [r.date, r]))

  const toUpsertRemote: RemoteHolidayOverride[] = []
  const toUpsertLocal: HolidayOverride[] = []

  for (const loc of local) {
    const rem = remoteMap.get(loc.date)
    if (!rem || loc.updatedAt > rem.updated_at) {
      toUpsertRemote.push({ user_id: uid, date: loc.date, is_holiday: loc.isHoliday, name: loc.name ?? null, updated_at: loc.updatedAt })
    } else if (rem.updated_at > loc.updatedAt) {
      toUpsertLocal.push({ date: rem.date, isHoliday: rem.is_holiday, name: rem.name ?? undefined, updatedAt: rem.updated_at })
    }
    remoteMap.delete(loc.date)
  }

  for (const rem of remoteMap.values()) {
    toUpsertLocal.push({ date: rem.date, isHoliday: rem.is_holiday, name: rem.name ?? undefined, updatedAt: rem.updated_at })
  }

  if (toUpsertRemote.length) {
    await supabase.from('holiday_overrides').upsert(toUpsertRemote)
  }
  if (toUpsertLocal.length) {
    await db.holidayOverrides.bulkPut(toUpsertLocal)
  }
}

interface RemoteHolidayOverride {
  user_id: string
  date: string
  is_holiday: boolean
  name: string | null
  updated_at: number
}

// ── 진입점 ────────────────────────────────────────────────────────

/** 로그인된 상태에서 전체 동기화. 실패해도 조용히 넘어감(로컬 우선) */
export async function syncAll(): Promise<void> {
  const uid = await userId()
  if (!uid) return

  await Promise.all([
    syncWeeks(uid),
    syncDays(uid),
    syncSettings(uid),
    syncHolidayOverrides(uid),
  ])
}
