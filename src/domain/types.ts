/** 근무/휴가 구간의 유형 */
export type SegmentType = 'work' | 'field' | 'annual' | 'halfday'

/**
 * 하루 안의 한 구간 (메타데이터: 화면 표시 + 역산 입력용).
 * 시각은 "자정 기준 분"으로 다룬다. 예: 09:55 → 595.
 * annual(종일 연차)은 시각이 없을 수 있어 null 허용.
 */
export interface Segment {
  type: SegmentType
  startMin: number | null
  endMin: number | null
}

/** 하루 기록 */
export interface DayRecord {
  id: string
  weekId: string
  /** "2026-05-26" */
  date: string
  /** 계산의 단일 진실원천(실적). 미입력이면 null. 공휴일은 0이 아니라 별도 플래그로 처리 */
  recognizedMinutes: number | null
  /** 미래 고정 목표(계획). 없으면 null */
  fixedTargetMinutes: number | null
  isHoliday: boolean
  holidayName: string | null
  /** 표시·역산용 메타데이터. 수동 입력 시 recognizedMinutes 산출 근거 */
  segments: Segment[]
  source: 'manual' | 'ocr'
  updatedAt: number
}

/** 한 주 기록 */
export interface WeekRecord {
  id: string
  /** 월요일 "2026-05-25" */
  startDate: string
  /** 일요일 "2026-05-31" */
  endDate: string
  /** 5일 만근 기준 목표(분). 디폴트 2400(40h). 연장 시 유저가 변경 */
  baseGoalMinutes: number
  updatedAt: number
}

export interface Settings {
  defaultBaseGoalMinutes: number
  dailyStandardMinutes: number
  lunchMinutes: number
  /** 계산엔 영향 없음. 안내 표시용 */
  coreTimeStart: string
  coreTimeEnd: string
}

export const DEFAULTS: Settings = {
  defaultBaseGoalMinutes: 2400, // 40h
  dailyStandardMinutes: 480, // 8h
  lunchMinutes: 60, // 1h
  coreTimeStart: '10:00',
  coreTimeEnd: '16:00',
}
