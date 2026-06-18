import { useEffect, useRef, useState } from 'react'

interface Props {
  label: string
  value: string   // "HH:MM" 24h, or ""
  onConfirm: (value: string) => void
  onCancel: () => void
}

const ITEM_H = 44
const AMPMS = ['오전', '오후']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function parse(hhmm: string): { aIdx: number; hIdx: number; mIdx: number } {
  if (!hhmm) return { aIdx: 0, hIdx: 8, mIdx: 0 } // 오전 9:00 default
  const [h, m] = hhmm.split(':').map(Number)
  const aIdx = h < 12 ? 0 : 1
  const hour12 = h % 12 || 12
  return { aIdx, hIdx: hour12 - 1, mIdx: m }
}

function format(aIdx: number, hIdx: number, mIdx: number): string {
  const h12 = hIdx + 1
  const h = aIdx === 0 ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12)
  return `${String(h).padStart(2, '0')}:${String(mIdx).padStart(2, '0')}`
}

export default function TimePicker({ label, value, onConfirm, onCancel }: Props) {
  const init = parse(value)
  const [aIdx, setAIdx] = useState(init.aIdx)
  const [hIdx, setHIdx] = useState(init.hIdx)
  const [mIdx, setMIdx] = useState(init.mIdx)

  const ampmRef = useRef<HTMLDivElement>(null)
  const hourRef = useRef<HTMLDivElement>(null)
  const minRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => {
      ampmRef.current && (ampmRef.current.scrollTop = init.aIdx * ITEM_H)
      hourRef.current && (hourRef.current.scrollTop = init.hIdx * ITEM_H)
      minRef.current && (minRef.current.scrollTop = init.mIdx * ITEM_H)
    })
  }, [])

  function onScroll(
    ref: React.RefObject<HTMLDivElement>,
    max: number,
    setter: (i: number) => void,
  ) {
    const el = ref.current
    if (!el) return
    const idx = Math.max(0, Math.min(max, Math.round(el.scrollTop / ITEM_H)))
    setter(idx)
  }

  return (
    <div className="picker-overlay" onClick={onCancel}>
      <div className="picker-card" onClick={(e) => e.stopPropagation()}>
        <div className="picker-card__label">{label}</div>

        <div className="picker-card__readout">
          <span className="picker-card__readout-ampm">{AMPMS[aIdx]}</span>
          <span className="picker-card__readout-time">
            {HOURS[hIdx]}:{MINS[mIdx]}
          </span>
        </div>

        <div className="picker-card__wheels">
          <div className="picker-card__highlight" />

          <div className="picker-card__cols">
            <div
              ref={ampmRef}
              className="picker-card__col"
              style={{ flex: '0 0 30%' }}
              onScroll={() => onScroll(ampmRef, 1, setAIdx)}
            >
              {AMPMS.map((it) => (
                <div key={it} className="picker-card__item">{it}</div>
              ))}
            </div>

            <div
              ref={hourRef}
              className="picker-card__col"
              onScroll={() => onScroll(hourRef, 11, setHIdx)}
            >
              {HOURS.map((it) => (
                <div key={it} className="picker-card__item picker-card__item--num">{it}</div>
              ))}
            </div>

            <div className="picker-card__colon">:</div>

            <div
              ref={minRef}
              className="picker-card__col"
              onScroll={() => onScroll(minRef, 59, setMIdx)}
            >
              {MINS.map((it) => (
                <div key={it} className="picker-card__item picker-card__item--num">{it}</div>
              ))}
            </div>
          </div>

          <div className="picker-card__fade picker-card__fade--top" />
          <div className="picker-card__fade picker-card__fade--bottom" />
        </div>

        <div className="picker-card__actions">
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onCancel}>취소</button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => onConfirm(format(aIdx, hIdx, mIdx))}>확인</button>
        </div>
      </div>
    </div>
  )
}
