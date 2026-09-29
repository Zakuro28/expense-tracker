import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3 } from 'lucide-react'
import {
  addDays,
  daysInMonth,
  fromISO,
  monthKey,
  money,
  moneyShort,
  moneyWhole,
  pad,
  rangeOf,
  todayISO,
  type Period,
  type Tx,
} from '../lib/data'

const OUT = '#1f7a4f'
const IN = '#eda100'
const MIN_H = 250
const TOP = 12
const BOTTOM = 26
const LEFT = 42

type Bucket = { key: string; label: string; tip: string; out: number; in: number; future: boolean; focus: boolean; start: string; end: string }

type Props = {
  period: Period
  anchor: string
  txs: Tx[] // whole book; the chart picks its own window
  budgetPerBucket: number | null
  onPick: (b: { period: Period; anchor: string }) => void
}

// Buckets for each view: a week of days (day & week), the days of a month, the months of a year
function buildBuckets(period: Period, anchor: string, txs: Tx[]): Bucket[] {
  const today = todayISO()
  const out: Bucket[] = []
  if (period === 'year') {
    const y = anchor.slice(0, 4)
    for (let m = 1; m <= 12; m++) {
      const k = `${y}-${pad(m)}`
      const start = `${k}-01`
      out.push({
        key: k,
        label: fromISO(start).toLocaleDateString('en-US', { month: 'narrow' }),
        tip: fromISO(start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        out: 0,
        in: 0,
        future: start > today,
        focus: false,
        start,
        end: `${k}-${pad(daysInMonth(k))}`,
      })
    }
  } else {
    const r = period === 'month' ? rangeOf('month', anchor) : rangeOf('week', anchor)
    for (let d = r.start; d <= r.end; d = addDays(d, 1)) {
      const date = fromISO(d)
      out.push({
        key: d,
        label: period === 'month' ? String(date.getDate()) : date.toLocaleDateString('en-US', { weekday: 'short' }),
        tip: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        out: 0,
        in: 0,
        future: d > today,
        focus: period === 'day' && d === anchor,
        start: d,
        end: d,
      })
    }
  }
  const index = new Map(out.map((b, i) => [b.key, i]))
  for (const t of txs) {
    if (t.type === 'save') continue // savings aren't spending or income
    const i = index.get(period === 'year' ? monthKey(t.date) : t.date)
    if (i !== undefined) out[i][t.type] += t.amount
  }
  return out
}

// Bar with 4px rounded top, square at the baseline
function bar(x: number, base: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  const top = base - h
  return `M${x} ${base} L${x} ${top + r} Q${x} ${top} ${x + r} ${top} L${x + w - r} ${top} Q${x + w} ${top} ${x + w} ${top + r} L${x + w} ${base} Z`
}

export default function PeriodChart({ period, anchor, txs, budgetPerBucket, onPick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [H, setH] = useState(MIN_H)
  const [hover, setHover] = useState<number | null>(null)
  // Money in starts hidden: big salary days would dwarf everyday spending
  const [showIn, setShowIn] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    // The chart grows to fill its card, so there's no empty space under it
    const ro = new ResizeObserver(([e]) => {
      setWidth(e.contentRect.width)
      setH(Math.max(MIN_H, Math.floor(e.contentRect.height)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const buckets = useMemo(() => buildBuckets(period, anchor, txs), [period, anchor, txs])
  const max = Math.max(...buckets.map((b) => Math.max(b.out, showIn ? b.in : 0)), (budgetPerBucket ?? 0) * 1.2, 1)
  // A round step (1, 2, 2.5 or 5 × a power of ten) giving at most four gridlines, at any size
  const mag = 10 ** Math.floor(Math.log10(max / 4))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => max / s <= 4) ?? 10 * mag
  const top = Math.ceil(max / step) * step
  const ticks = [0, top / 2, top]

  const plotW = Math.max(width - LEFT, 100)
  const col = plotW / buckets.length
  const pair = showIn ? 2 : 1
  const barW = Math.max(Math.min((col - 4) / pair - 1, 28), 2) // 2px gaps between and inside groups
  const y = (v: number) => TOP + (1 - v / top) * (H - TOP - BOTTOM)
  const base = y(0)
  const everyLabel = buckets.length > 14 ? [0, 4, 9, 14, 19, 24, buckets.length - 1] : buckets.map((_, i) => i)

  const title = period === 'year' ? 'Month by month' : period === 'month' ? 'Day by day' : 'This week, day by day'
  const h = hover !== null ? buckets[hover] : null

  return (
    <section aria-labelledby="chart-title" className="card flex h-full flex-col p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="chart-title" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="size-4.5 text-leaf" aria-hidden /> {title}
        </h2>
        {/* Legend doubles as a toggle for the income series */}
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: OUT }} aria-hidden /> Money out
          </span>
          <button type="button" onClick={() => setShowIn((v) => !v)} aria-pressed={showIn} className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 transition-opacity hover:bg-wash ${showIn ? '' : 'opacity-45'}`}>
            <span className="size-2.5 rounded-sm" style={{ background: IN }} aria-hidden /> {showIn ? 'Money in' : 'Show money in'}
          </button>
          {budgetPerBucket !== null && (
            <span className="hidden items-center gap-1.5 text-muted sm:flex">
              <span className="inline-block w-4 border-t-2 border-dashed border-ink/50" aria-hidden />
              Budget {moneyWhole(budgetPerBucket)}
            </span>
          )}
        </div>
      </div>

      <div ref={wrapRef} className="relative mt-5 min-h-[250px] flex-1" onMouseLeave={() => setHover(null)}>
        <svg width={width} height={H} className="absolute inset-x-0 top-0 block overflow-visible" role="img" aria-label={`${title}: ${showIn ? 'money in and out' : 'money out'}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={width} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#c3cfc6' : '#e8eee6'} strokeWidth={1} />
              <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="num fill-muted text-[11px]">
                {moneyShort(t)}
              </text>
            </g>
          ))}

          {buckets.map((b, i) => {
            const groupW = barW * pair + (pair - 1) * 2
            const x0 = LEFT + i * col + (col - groupW) / 2
            const dim = hover !== null && hover !== i
            return (
              <g key={b.key}>
                <motion.rect
                  x={LEFT + i * col}
                  y={TOP - 4}
                  width={col}
                  height={base - TOP + 4}
                  rx={6}
                  fill={b.focus ? '#c9f26b' : '#1f7a4f'}
                  initial={false}
                  animate={{ opacity: b.focus ? 0.35 : hover === i ? 0.09 : 0 }}
                  transition={{ duration: 0.2 }}
                  pointerEvents="none"
                />
                {b.future ? (
                  <rect x={x0} y={base - 3} width={groupW} height={3} rx={1.5} fill="#e8eee6" />
                ) : (
                  <>
                    <motion.path
                      initial={{ d: bar(x0, base, barW, 0) }}
                      animate={{ d: bar(x0, base, barW, base - y(b.out)), opacity: dim ? 0.35 : 1 }}
                      transition={{ d: { duration: 0.8, ease: [0.34, 1.4, 0.64, 1], delay: 0.2 + i * 0.02 }, opacity: { duration: 0.2 } }}
                      fill={OUT}
                    />
                    <AnimatePresence>
                      {showIn && (
                        <motion.path
                          key="in"
                          initial={{ d: bar(x0 + barW + 2, base, barW, 0) }}
                          animate={{ d: bar(x0 + barW + 2, base, barW, base - y(b.in)), opacity: dim ? 0.35 : 1 }}
                          exit={{ d: bar(x0 + barW + 2, base, barW, 0) }}
                          transition={{ d: { duration: 0.8, ease: [0.34, 1.4, 0.64, 1], delay: 0.3 + i * 0.02 }, opacity: { duration: 0.2 } }}
                          fill={IN}
                        />
                      )}
                    </AnimatePresence>
                  </>
                )}
                {!b.future && (
                  <rect
                    x={LEFT + i * col}
                    y={TOP}
                    width={col}
                    height={H - TOP}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => onPick({ period: period === 'year' ? 'month' : 'day', anchor: b.start })}
                  />
                )}
              </g>
            )
          })}

          {budgetPerBucket !== null && (
            <line x1={LEFT} x2={width} y1={y(budgetPerBucket)} y2={y(budgetPerBucket)} stroke="#0f2a1f" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="5 5" pointerEvents="none" />
          )}

          {everyLabel.map((i) => (
            <text key={i} x={LEFT + (i + 0.5) * col} y={H - 6} textAnchor="middle" className={`num text-[11px] ${buckets[i].focus ? 'fill-ink font-bold' : 'fill-muted'}`}>
              {buckets[i].label}
            </text>
          ))}
        </svg>

        <AnimatePresence>
          {h && (
            <motion.div
              key="tip"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, left: Math.min(Math.max(LEFT + (hover! + 0.5) * col, 80), width - 80) }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-sm whitespace-nowrap text-white shadow-lg"
            >
              <p className="text-center text-white/65">{h.tip}</p>
              <p className="flex items-center gap-2">
                <span className="size-2 rounded-sm" style={{ background: OUT }} /> Out <span className="ml-auto pl-3 font-semibold">{money(h.out)}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="size-2 rounded-sm" style={{ background: IN }} /> In <span className="ml-auto pl-3 font-semibold">{money(h.in)}</span>
              </p>
              {budgetPerBucket !== null && h.out > budgetPerBucket && <p className="text-center text-xs text-gold">Over budget</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mt-auto pt-3 text-sm text-muted">{period === 'year' ? 'Tap a month to open it.' : 'Tap a day to see just that day.'}</p>
    </section>
  )
}
