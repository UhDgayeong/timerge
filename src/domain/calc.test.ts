import { describe, it, expect } from 'vitest'
import {
  minutesBetween,
  formatMinutes,
  parseClock,
  formatClock,
  recognizedFromSegments,
  isWeekend,
  holidayCount,
  weekGoalMinutes,
  summarizeWeek,
  departureMinutes,
  effectiveFixedTarget,
  effectiveTarget,
} from './calc'
import { DEFAULTS, type DayRecord, type WeekRecord, type Segment, type SegmentType } from './types'

// ── 헬퍼 ─────────────────────────────────────────────────────

function seg(type: SegmentType, start: string | null, end: string | null): Segment {
  return { type, startMin: start ? parseClock(start) : null, endMin: end ? parseClock(end) : null }
}

function day(date: string, opts: Partial<DayRecord> = {}): DayRecord {
  return {
    id: date,
    weekId: 'W',
    date,
    recognizedMinutes: null,
    fixedTargetMinutes: null,
    isHoliday: false,
    holidayName: null,
    segments: [],
    source: 'manual',
    updatedAt: 0,
    ...opts,
  }
}

const week: WeekRecord = {
  id: '2026-W22',
  startDate: '2026-05-25',
  endDate: '2026-05-31',
  baseGoalMinutes: 2400, // 40h
  updatedAt: 0,
}

// ── 시간 유틸 ────────────────────────────────────────────────

describe('minutesBetween', () => {
  it('일반 구간', () => {
    expect(minutesBetween(parseClock('09:50'), parseClock('19:09'))).toBe(559) // 9h19m
  })
  it('자정 넘김 (22:00~02:00)', () => {
    expect(minutesBetween(parseClock('22:00'), parseClock('02:00'))).toBe(240) // 4h
  })
})

describe('formatMinutes', () => {
  it.each([
    [499, '8시간 19분'],
    [480, '8시간'],
    [60, '1시간'],
    [5, '5분'],
    [0, '0분'],
    [-480, '-8시간'],
  ])('%i분 → %s', (min, expected) => {
    expect(formatMinutes(min)).toBe(expected)
  })
})

describe('formatClock / parseClock', () => {
  it('왕복', () => {
    expect(formatClock(parseClock('15:30'))).toBe('15:30')
  })
  it('24h 넘김 wrap (26:00 → 02:00)', () => {
    expect(formatClock(26 * 60)).toBe('02:00')
  })
})

// ── 하루 인정시간 (점심 규칙) ────────────────────────────────

describe('recognizedFromSegments', () => {
  it('종일 근무 09:50~19:09 → 점심 1h 차감 = 8h19m', () => {
    expect(recognizedFromSegments([seg('work', '09:50', '19:09')])).toBe(499)
  })

  it('외근 09:00~18:00 → 8h (계산은 근무와 동일)', () => {
    expect(recognizedFromSegments([seg('field', '09:00', '18:00')])).toBe(480)
  })

  it('오후 반차: 오전근무 10:00~12:00 + 반차 → 점심 차감 = 1h+4h = 5h', () => {
    const segs = [seg('work', '10:00', '12:00'), seg('halfday', '12:00', '16:00')]
    expect(recognizedFromSegments(segs)).toBe(300)
  })

  it('오전 반차: 반차 09:00~14:00 + 오후근무 14:00~18:30 → 점심 차감 없음 = 4h+4.5h = 8h30m (FLEX 5.26)', () => {
    const segs = [seg('halfday', '09:00', '14:00'), seg('work', '14:00', '18:30')]
    expect(recognizedFromSegments(segs)).toBe(510)
  })

  it('종일 연차 → 8h 고정', () => {
    expect(recognizedFromSegments([seg('annual', null, null)])).toBe(480)
  })
})

// ── 주/요일 ──────────────────────────────────────────────────

describe('요일 판정', () => {
  it('2026-05-25는 월요일(평일)', () => {
    expect(isWeekend('2026-05-25')).toBe(false)
  })
  it('2026-05-30 토, 05-31 일은 주말', () => {
    expect(isWeekend('2026-05-30')).toBe(true)
    expect(isWeekend('2026-05-31')).toBe(true)
  })
})

describe('weekGoalMinutes', () => {
  it('공휴일 0개 → 40h', () => {
    expect(weekGoalMinutes(2400, [day('2026-05-26'), day('2026-05-27')])).toBe(2400)
  })
  it('평일 공휴일 1개 → 32h', () => {
    const days = [day('2026-05-25', { isHoliday: true }), day('2026-05-26')]
    expect(holidayCount(days)).toBe(1)
    expect(weekGoalMinutes(2400, days)).toBe(1920)
  })
  it('연장 52h + 공휴일 1개 → 44h', () => {
    const days = [day('2026-06-03', { isHoliday: true })] // 수 지방선거일
    expect(weekGoalMinutes(3120, days)).toBe(2640) // 52h-8h=44h
  })
})

// ── 주간 요약 (설계 핵심 시나리오) ───────────────────────────

describe('summarizeWeek', () => {
  it('FLEX 5.25주: 공휴일 1 + 평일 4일 = 목표 32h 정확히 달성', () => {
    const days = [
      day('2026-05-25', { isHoliday: true, holidayName: '부처님오신날 대체휴일' }),
      day('2026-05-26', { recognizedMinutes: 510 }),
      day('2026-05-27', { recognizedMinutes: 485 }),
      day('2026-05-28', { recognizedMinutes: 445 }),
      day('2026-05-29', { recognizedMinutes: 480 }),
      day('2026-05-30'),
      day('2026-05-31'),
    ]
    const s = summarizeWeek(week, days, DEFAULTS)
    expect(s.goalMinutes).toBe(1920) // 32h
    expect(s.totalRecognizedMinutes).toBe(1920)
    expect(s.remainingMinutes).toBe(0)
    expect(s.overtimeMinutes).toBe(0)
    expect(s.pendingDays).toBe(0)
  })

  it('역산: 목표40h·월공휴일·금 5h 고정 → 화수목 평균 9h', () => {
    const days = [
      day('2026-05-25', { isHoliday: true }),
      day('2026-05-26'),
      day('2026-05-27'),
      day('2026-05-28'),
      day('2026-05-29', { fixedTargetMinutes: 300 }), // 금 5h 고정
      day('2026-05-30'),
      day('2026-05-31'),
    ]
    const s = summarizeWeek(week, days, DEFAULTS)
    expect(s.goalMinutes).toBe(1920)
    expect(s.pendingDays).toBe(3) // 화수목
    expect(s.remainingMinutes).toBe(1620) // 1920 - 300
    expect(s.avgNeededPerPendingDay).toBe(540) // 9h
  })

  it('주말 근무는 누적에 포함되어 초과근무로 잡힌다', () => {
    const days = [
      day('2026-05-25', { isHoliday: true }),
      day('2026-05-26', { recognizedMinutes: 510 }),
      day('2026-05-27', { recognizedMinutes: 485 }),
      day('2026-05-28', { recognizedMinutes: 445 }),
      day('2026-05-29', { recognizedMinutes: 480 }),
      day('2026-05-30', { recognizedMinutes: 480 }), // 토 출근 8h
      day('2026-05-31'),
    ]
    const s = summarizeWeek(week, days, DEFAULTS)
    expect(s.totalRecognizedMinutes).toBe(2400) // 1920 + 480
    expect(s.overtimeMinutes).toBe(480) // 목표 1920 초과분
    expect(s.pendingDays).toBe(0)
  })
})

// ── 요일별 목표 규칙 (weekdayTargets) ────────────────────────
// 2026-05-29 = 금(getUTCDay 5), 05-28 = 목

// 금 10:00~15:00 규칙 (5h clock − 1h 점심 = 4h 인정)
const FRI_RULE = { startMin: parseClock('10:00'), endMin: parseClock('15:00') }

describe('effectiveFixedTarget', () => {
  const fri = { ...DEFAULTS, weekdayTargets: { 5: FRI_RULE } }

  it('요일 규칙이 미실적 평일에 적용된다', () => {
    expect(effectiveFixedTarget(day('2026-05-29'), fri)).toBe(240) // 금 → 4h
    expect(effectiveFixedTarget(day('2026-05-28'), fri)).toBeNull() // 목은 규칙 없음
  })

  it('홈 수동 override(fixedTargetMinutes)가 요일 규칙을 이긴다', () => {
    expect(effectiveFixedTarget(day('2026-05-29', { fixedTargetMinutes: 360 }), fri)).toBe(360)
  })

  it('fixedTargetManual=true + null = 규칙 있어도 이번 주만 해제(미정)', () => {
    expect(effectiveFixedTarget(day('2026-05-29', { fixedTargetManual: true }), fri)).toBeNull()
  })

  it('실적·공휴일·주말이면 목표 무관(null)', () => {
    expect(effectiveFixedTarget(day('2026-05-29', { recognizedMinutes: 300 }), fri)).toBeNull()
    expect(effectiveFixedTarget(day('2026-05-29', { isHoliday: true }), fri)).toBeNull()
    expect(effectiveFixedTarget(day('2026-05-30'), fri)).toBeNull() // 토
  })

  it('effectiveTarget이 요일 규칙의 출퇴근 시각을 반환한다', () => {
    const t = effectiveTarget(day('2026-05-29'), fri)
    expect(t).toEqual({ minutes: 240, startMin: parseClock('10:00'), endMin: parseClock('15:00') })
  })

  it('fixedTargetMinutes override는 시각 정보 없이 분만 반환', () => {
    const t = effectiveTarget(day('2026-05-29', { fixedTargetMinutes: 360 }), fri)
    expect(t).toEqual({ minutes: 360 })
  })
})

describe('summarizeWeek + 요일 규칙', () => {
  it('목표40h·금 4h 규칙 → 월화수목 평균, 남은 = 2400−240', () => {
    const fri = { ...DEFAULTS, weekdayTargets: { 5: FRI_RULE } }
    const days = [
      day('2026-05-25'),
      day('2026-05-26'),
      day('2026-05-27'),
      day('2026-05-28'),
      day('2026-05-29'), // 금 → 규칙 240 적용
      day('2026-05-30'),
      day('2026-05-31'),
    ]
    const s = summarizeWeek(week, days, fri)
    expect(s.pendingDays).toBe(4) // 월화수목
    expect(s.remainingMinutes).toBe(2160) // 2400 − 240
    expect(s.avgNeededPerPendingDay).toBe(540) // 9h
  })

  it('이번 주만 금요일 해제하면 금도 미정에 합류', () => {
    const fri = { ...DEFAULTS, weekdayTargets: { 5: FRI_RULE } }
    const days = [
      day('2026-05-25'),
      day('2026-05-26'),
      day('2026-05-27'),
      day('2026-05-28'),
      day('2026-05-29', { fixedTargetManual: true }), // 이번 주만 해제
      day('2026-05-30'),
      day('2026-05-31'),
    ]
    const s = summarizeWeek(week, days, fri)
    expect(s.pendingDays).toBe(5) // 월~금 전부 미정
    expect(s.remainingMinutes).toBe(2400)
  })
})

// ── 마지막 근무일 역산 ───────────────────────────────────────

describe('departureMinutes', () => {
  it('09:30 출근, 5h 필요 → 점심 포함 15:30 이후 퇴근', () => {
    const out = departureMinutes(parseClock('09:30'), 300)
    expect(formatClock(out)).toBe('15:30')
  })
})
