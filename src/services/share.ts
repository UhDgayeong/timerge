import { supabase } from '../lib/supabase'
import { getSettings, saveSettings } from '../db/index'
import { syncAll } from './sync'
import type { WeekdayRule } from '../domain/types'

/** 현재 발급된 공유 토큰이 있으면 그대로, 없으면 새로 발급한다 */
export async function ensureShareToken(): Promise<string> {
  const settings = await getSettings()
  if (settings.shareToken) return settings.shareToken
  const token = crypto.randomUUID()
  await saveSettings({ ...settings, shareToken: token })
  await syncAll()
  return token
}

/** 기존 링크를 무효화하고 새 토큰을 발급한다 */
export async function regenerateShareToken(): Promise<string> {
  const settings = await getSettings()
  const token = crypto.randomUUID()
  await saveSettings({ ...settings, shareToken: token })
  await syncAll()
  return token
}

export async function setShareDisplayName(name: string): Promise<void> {
  const settings = await getSettings()
  await saveSettings({ ...settings, shareDisplayName: name.trim() || null })
  await syncAll()
}

const PUBLIC_ORIGIN = 'https://timerge.vercel.app'

export function shareUrl(token: string): string {
  return `${PUBLIC_ORIGIN}/share/${token}`
}

export interface SharedDay {
  id: string
  date: string
  recognized_minutes: number | null
  fixed_target_minutes: number | null
  fixed_target_manual: boolean
  is_holiday: boolean
  holiday_name: string | null
  segments: unknown
}

export interface SharedWeekData {
  displayName: string | null
  week: { id: string; startDate: string; endDate: string; baseGoalMinutes: number } | null
  days: SharedDay[]
  settings: {
    dailyStandardMinutes: number
    lunchMinutes: number
    weekdayTargets: Record<number, WeekdayRule>
    coreTimeStart: string
    coreTimeEnd: string
  } | null
}

/** 공개 토큰으로 공유 주간 데이터를 가져온다. 토큰이 잘못됐거나 데이터가 없으면 null */
export async function fetchSharedWeek(token: string): Promise<SharedWeekData | null> {
  const { data, error } = await supabase.rpc('get_shared_week', { p_token: token })
  if (error || !data) return null
  return data as SharedWeekData
}
