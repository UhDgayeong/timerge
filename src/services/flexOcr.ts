import type { Segment, SegmentType } from '../domain/types'

export interface OcrDay {
  dayOfMonth: number
  recognizedMinutes: number | null
  isHoliday: boolean
  holidayName: string | null
  segments: Segment[]
}

export interface OcrResult {
  month: number | null
  days: OcrDay[]
}

export async function ocrImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const url = URL.createObjectURL(file)
  try {
    const worker = await createWorker('kor+eng', 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100))
      },
    })
    const {
      data: { text },
    } = await worker.recognize(url)
    await worker.terminate()
    return text
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function parseFlexText(raw: string): OcrResult {
  // Week range: "6.1 - 6.7" or "5. 25 - 5. 31"
  const weekMatch = raw.match(/(\d{1,2})\s*\.\s*\d{1,2}\s*[-–]/)
  const month = weekMatch ? parseInt(weekMatch[1]) : null

  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  interface Section {
    dayNum: number
    lines: string[]
  }
  const sections: Section[] = []
  let cur: Section | null = null

  for (const line of lines) {
    // Day header: starts with 1-2 digits then whitespace
    const m = line.match(/^(\d{1,2})\s/)
    if (m) {
      const n = parseInt(m[1])
      if (n >= 1 && n <= 31) {
        const hasBadge = /\d+시간/.test(line)
        // Holiday day: has Korean text that isn't just unit words
        const hasKorean = /[가-힣]{2,}/.test(line) && !/^[\d\s]+$/.test(line)
        if (hasBadge || hasKorean) {
          if (cur) sections.push(cur)
          cur = { dayNum: n, lines: [line] }
          continue
        }
      }
    }
    cur?.lines.push(line)
  }
  if (cur) sections.push(cur)

  const days: OcrDay[] = []
  const seen = new Set<number>()

  for (const s of sections) {
    if (seen.has(s.dayNum)) continue
    seen.add(s.dayNum)

    const headerLine = s.lines[0]
    const allText = s.lines.join('\n')

    // Badge: N시간M분 or N시간 on the header line
    const badgeMatch =
      headerLine.match(/(\d+)시간\s*(\d+)분/) || headerLine.match(/(\d+)시간(?!\s*\d+분)/)
    const recognizedMinutes = badgeMatch
      ? parseInt(badgeMatch[1]) * 60 + (badgeMatch[2] ? parseInt(badgeMatch[2]) : 0)
      : null

    // Holiday: ·/ㆍ followed by Korean name, only on days with no badge
    const holidayMatch = headerLine.match(/[·ㆍ]\s*([가-힣][가-힣\s]{1,20})/)
    const isHoliday = !!holidayMatch && recognizedMinutes === null
    const holidayName = holidayMatch?.[1]?.trim() ?? null

    // Segments
    const segments: Segment[] = []

    if (/하루 종일/.test(allText)) {
      segments.push({ type: 'annual', startMin: null, endMin: null, lunchExcluded: false })
    } else {
      for (let i = 0; i < s.lines.length; i++) {
        const line = s.lines[i]
        // Time range: H:MM - 오후 H:MM  (오전 is often garbled, treated as AM by default)
        const t = line.match(/(\d{1,2}:\d{2})\s*[-–]\s*오후\s*(\d{1,2}:\d{2})/)
        if (!t) continue

        const [sh, sm] = t[1].split(':').map(Number)
        const [eh, em] = t[2].split(':').map(Number)
        const startMin = sh * 60 + sm
        const endMin = (eh + 12) * 60 + em

        const ctx = s.lines.slice(i, i + 3).join(' ')
        let type: SegmentType = 'work'
        if (/외근/.test(ctx)) type = 'field'
        else if (/오전반차/.test(ctx)) type = 'halfday-am'
        else if (/오후반차/.test(ctx)) type = 'halfday-pm'
        else if (/연차/.test(ctx)) type = 'annual'

        segments.push({
          type,
          startMin,
          endMin,
          lunchExcluded: type === 'work' || type === 'field' || type === 'halfday-am',
        })
      }
    }

    days.push({ dayOfMonth: s.dayNum, recognizedMinutes, isHoliday, holidayName, segments })
  }

  return {
    month,
    days: days.sort((a, b) => a.dayOfMonth - b.dayOfMonth),
  }
}

/** 여러 이미지 OCR 결과 병합. 같은 날 중복 시 인정시간이 있는 쪽 우선. */
export function mergeOcrResults(results: OcrResult[]): OcrResult {
  const month = results.find((r) => r.month != null)?.month ?? null
  const byDay = new Map<number, OcrDay>()
  for (const r of results) {
    for (const d of r.days) {
      const existing = byDay.get(d.dayOfMonth)
      if (!existing || (d.recognizedMinutes != null && existing.recognizedMinutes == null)) {
        byDay.set(d.dayOfMonth, d)
      }
    }
  }
  return {
    month,
    days: [...byDay.values()].sort((a, b) => a.dayOfMonth - b.dayOfMonth),
  }
}
