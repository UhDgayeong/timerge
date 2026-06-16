import type { Segment, SegmentType, DayRecord, WeekRecord, Settings } from './types'

const MIN_PER_DAY = 24 * 60
const LEAVE_FULL = 480 // 연차 8h
const LEAVE_HALF = 240 // 반차 4h

// ── 시간 유틸 ────────────────────────────────────────────────

/** 자정 기준 분 차이. 퇴근 < 출근이면 익일로 보고 +24h */
export function minutesBetween(startMin: number, endMin: number): number {
  let end = endMin
  if (end < startMin) end += MIN_PER_DAY
  return end - startMin
}

/** 정수 분 → "9시간 5분" / "8시간" / "0분" */
export function formatMinutes(min: number): string {
  const sign = min < 0 ? '-' : ''
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${sign}${m}분`
  if (m === 0) return `${sign}${h}시간`
  return `${sign}${h}시간 ${m}분`
}

/** "HH:MM" → 자정 기준 분 */
export function parseClock(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** 자정 기준 분 → "HH:MM" (24h를 넘으면 익일로 wrap) */
export function formatClock(min: number): string {
  const w = ((min % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY
  const h = Math.floor(w / 60)
  const m = w % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── 하루 인정시간 (수동 입력용) ──────────────────────────────

/**
 * 휴가 구간이 모든 근무 구간보다 시간상 앞이면(= 오전 휴가) 점심이 이미 흡수된 것으로 본다.
 * lunchExcluded가 없는 레거시 데이터에서만 사용.
 */
function morningLeaveAbsorbsLunch(work: Segment[], leave: Segment[]): boolean {
  const workStarts = work.map((w) => w.startMin).filter((v): v is number => v != null)
  if (workStarts.length === 0) return false
  const earliestWork = Math.min(...workStarts)
  return leave.some((l) => l.endMin != null && l.endMin <= earliestWork)
}

function isHalfdayType(type: SegmentType): boolean {
  return type === 'halfday-am' || type === 'halfday-pm' || type === 'halfday'
}

/**
 * 세그먼트로부터 하루 인정시간(분)을 계산한다 (수동 입력 경로).
 * - 연차=480, 반차(오전/오후/레거시)=240
 * - 근무/외근 = (퇴근 − 출근)
 * - 점심(lunchMinutes): lunchExcluded가 명시된 새 데이터는 명시적 규칙 사용,
 *   없는 레거시 데이터는 위치 기반 자동 판단(morningLeaveAbsorbsLunch).
 *
 * OCR 경로는 FLEX 배지값을 recognizedMinutes에 직접 넣으므로 이 함수를 쓰지 않는다.
 */
export function recognizedFromSegments(segments: Segment[], lunchMinutes = 60): number {
  const work = segments.filter((s) => s.type === 'work' || s.type === 'field')
  const leave = segments.filter((s) => s.type === 'annual' || isHalfdayType(s.type))

  let total = 0
  for (const s of leave) total += s.type === 'annual' ? LEAVE_FULL : LEAVE_HALF
  for (const s of work) {
    if (s.startMin == null || s.endMin == null) continue
    total += minutesBetween(s.startMin, s.endMin)
  }

  const hasExplicitLunch = segments.some((s) => s.lunchExcluded !== undefined)
  if (hasExplicitLunch) {
    // 오전반차가 lunchExcluded=true면 점심을 흡수 → 근무 구간에서 차감 안 함
    const halfdayAbsorbs = segments.some(
      (s) => (s.type === 'halfday-am' || s.type === 'halfday') && s.lunchExcluded,
    )
    const workDeducts =
      !halfdayAbsorbs && work.length > 0 && work.some((s) => s.lunchExcluded)
    if (workDeducts) total -= lunchMinutes
  } else {
    // 레거시: 위치 기반 자동 판단
    // 실제 근무 시간이 0이면 점심 차감 안 함 (startMin === endMin인 경우 방어)
    const workDuration = work.reduce(
      (sum, s) =>
        s.startMin != null && s.endMin != null ? sum + minutesBetween(s.startMin, s.endMin) : sum,
      0,
    )
    if (workDuration > 0 && !morningLeaveAbsorbsLunch(work, leave)) {
      total -= lunchMinutes
    }
  }

  return total
}

/** 세그먼트 기준으로 실제 점심이 차감됐는지 여부 (DayCard 배지용) */
export function wasLunchDeducted(segments: Segment[]): boolean {
  const work = segments.filter((s) => s.type === 'work' || s.type === 'field')
  const leave = segments.filter((s) => s.type === 'annual' || isHalfdayType(s.type))
  const hasExplicitLunch = segments.some((s) => s.lunchExcluded !== undefined)
  if (hasExplicitLunch) {
    const halfdayAbsorbs = segments.some(
      (s) => (s.type === 'halfday-am' || s.type === 'halfday') && s.lunchExcluded,
    )
    return !halfdayAbsorbs && work.length > 0 && work.some((s) => s.lunchExcluded)
  }
  return work.length > 0 && !morningLeaveAbsorbsLunch(work, leave)
}

// ── 주/요일 ──────────────────────────────────────────────────

/** "2026-05-25" → 요일(일=0…토=6). 타임존 독립(UTC 기준) */
function weekday(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay()
}

export function isWeekend(dateStr: string): boolean {
  const d = weekday(dateStr)
  return d === 0 || d === 6
}

/** 근무가능일 = 평일이고 공휴일 아님 (연차·반차일도 포함) */
export function isWorkableDay(day: DayRecord): boolean {
  return !day.isHoliday && !isWeekend(day.date)
}

/** 목표를 줄이는 공휴일 수 = 평일 공휴일만 카운트 */
export function holidayCount(days: DayRecord[]): number {
  return days.filter((d) => d.isHoliday && !isWeekend(d.date)).length
}

/** effectiveTarget 반환값 — 출퇴근 시각은 요일 규칙에서 온 경우에만 포함 */
export interface EffectiveTarget {
  minutes: number
  /** 요일 규칙에서 온 출근 예정 시각 (자정 기준 분) */
  startMin?: number
  /** 요일 규칙에서 온 퇴근 예정 시각 (자정 기준 분) */
  endMin?: number
}

/**
 * 한 날의 계획 목표를 결정한다 (출퇴근 시각 포함). 우선순위:
 *  1. 실적(recognizedMinutes) 있으면 → null
 *  2. 근무가능일 아니면(공휴일·주말) → null
 *  3. fixedTargetMinutes 있으면 → 그 값 (홈 수동 override, 시각 정보 없음)
 *  4. fixedTargetManual=true → null (이번 주만 해제)
 *  5. 요일 규칙 있으면 → 출퇴근 시각에서 계산한 인정시간 + 시각 정보
 */
export function effectiveTarget(day: DayRecord, settings: Settings): EffectiveTarget | null {
  if (day.recognizedMinutes != null) return null
  if (!isWorkableDay(day)) return null
  if (day.fixedTargetMinutes != null) return { minutes: day.fixedTargetMinutes }
  if (day.fixedTargetManual) return null
  const wd = new Date(`${day.date}T00:00:00Z`).getUTCDay()
  const rule = settings.weekdayTargets?.[wd]
  if (!rule || rule.startMin == null || rule.endMin == null) return null
  const minutes = recognizedFromSegments(
    [{ type: 'work', startMin: rule.startMin, endMin: rule.endMin }],
    settings.lunchMinutes,
  )
  return { minutes, startMin: rule.startMin, endMin: rule.endMin }
}

/** effectiveTarget의 분(minutes)만 반환하는 thin wrapper. 기존 코드와 호환 유지 */
export function effectiveFixedTarget(day: DayRecord, settings: Settings): number | null {
  return effectiveTarget(day, settings)?.minutes ?? null
}

/** 이번 주 목표(분) = baseGoal − 공휴일수 × 하루기준시간 */
export function weekGoalMinutes(
  baseGoalMinutes: number,
  days: DayRecord[],
  dailyStandard = 480,
): number {
  return baseGoalMinutes - holidayCount(days) * dailyStandard
}

// ── 주간 요약 (앱의 핵심) ────────────────────────────────────

export interface WeekSummary {
  /** 이번 주 목표 (공휴일 반영) */
  goalMinutes: number
  /** 누적 인정시간 (공휴일은 0, 주말 근무는 포함) */
  totalRecognizedMinutes: number
  /** 실적 + 미래 고정목표 (근무가능 평일 기준) */
  totalAccountedMinutes: number
  /** 남은 실근무 = goal − accounted (음수면 목표 초과) */
  remainingMinutes: number
  /** 미정인 근무가능일 수 */
  pendingDays: number
  /** 미정일에 균등 배분 시 하루 필요시간. 미정일 없으면 null */
  avgNeededPerPendingDay: number | null
  /** 초과근무 = max(0, 누적 − 목표) */
  overtimeMinutes: number
}

export function summarizeWeek(
  week: WeekRecord,
  days: DayRecord[],
  settings: Settings,
): WeekSummary {
  const goal = weekGoalMinutes(week.baseGoalMinutes, days, settings.dailyStandardMinutes)

  let totalRecognized = 0
  let totalFixed = 0
  let pendingDays = 0

  for (const d of days) {
    // 누적: 공휴일이 아니고 실적이 있으면 합산 (주말 근무 포함)
    if (!d.isHoliday && d.recognizedMinutes != null) {
      totalRecognized += d.recognizedMinutes
    }
    // 평일·비공휴일 중 실적이 없는 날 → 고정목표(요일 규칙·수동) or 미정
    if (isWorkableDay(d) && d.recognizedMinutes == null) {
      const eff = effectiveFixedTarget(d, settings)
      if (eff != null) totalFixed += eff
      else pendingDays += 1
    }
  }

  const totalAccounted = totalRecognized + totalFixed
  const remaining = goal - totalAccounted

  return {
    goalMinutes: goal,
    totalRecognizedMinutes: totalRecognized,
    totalAccountedMinutes: totalAccounted,
    remainingMinutes: remaining,
    pendingDays,
    avgNeededPerPendingDay: pendingDays > 0 ? remaining / pendingDays : null,
    overtimeMinutes: Math.max(0, totalRecognized - goal),
  }
}

// ── 마지막 근무일 역산 ───────────────────────────────────────

/** 출근시각(분)에 필요시간과 점심을 더한 퇴근 가능 시각(분) */
export function departureMinutes(
  clockInMin: number,
  neededMinutes: number,
  lunchMinutes = 60,
): number {
  return clockInMin + neededMinutes + lunchMinutes
}

export interface LastDayDepartureInfo {
  /** 퇴근 가능 시각 (자정 기준 분) */
  departureMin: number
  /** 출근 시각 (자정 기준 분) */
  clockInMin: number
}

/**
 * 마지막 근무일의 퇴근 가능 시각을 계산한다.
 * remainingMinutes = 이 날 포함 이번 주에 남은 목표분 (WeekSummary.remainingMinutes).
 *
 * - 오전반차(halfday-am): 240분 이미 기여 + 점심 흡수 → 추가 근무만 역산
 * - 일반 근무: clockIn + remaining + lunch
 *
 * null 반환 = 역산 불가 (출근 미입력, 이미 실적 있음)
 */
export function calcLastDayDeparture(
  day: DayRecord,
  remainingMinutes: number,
  lunchMinutes = 60,
): LastDayDepartureInfo | null {
  if (day.recognizedMinutes != null) return null

  const workSegs = day.segments.filter((s) => s.type === 'work' || s.type === 'field')
  const clockInMin = workSegs.find((s) => s.startMin != null)?.startMin
  if (clockInMin == null) return null

  const hasHalfdayAm = day.segments.some(
    (s) => s.type === 'halfday-am' || s.type === 'halfday',
  )

  // 오전반차: 240분 기여 + 점심 흡수(차감 없음)
  const alreadyContributed = hasHalfdayAm ? 240 : 0
  const lunchToAdd = hasHalfdayAm ? 0 : lunchMinutes
  const neededWork = Math.max(0, remainingMinutes - alreadyContributed)

  return {
    clockInMin,
    departureMin: clockInMin + neededWork + lunchToAdd,
  }
}

/**
 * 그 주 마지막 근무가능일 (평일 + 비공휴일 중 가장 늦은 날).
 * 연차·반차일도 포함(isWorkableDay 기준).
 */
export function lastWorkableDay(days: DayRecord[]): DayRecord | null {
  const workable = days.filter(isWorkableDay)
  return workable.length > 0 ? workable[workable.length - 1] : null
}
