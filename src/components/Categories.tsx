import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PieChart } from 'lucide-react'
import { CATEGORIES, INCOME_CATEGORIES, money, type CatId, type Tx, type TxType } from '../lib/data'

type Props = { txs: Tx[]; active: CatId | null; onPick: (c: CatId | null) => void; phrase: string }

export default function Categories({ txs, active, onPick, phrase }: Props) {
  const [side, setSide] = useState<Exclude<TxType, 'save'>>('out')
  const list = txs.filter((t) => t.type === side)
  const cats = side === 'out' ? CATEGORIES : INCOME_CATEGORIES
  const total = list.reduce((s, t) => s + t.amount, 0)
  const rows = cats
    .map((c) => ({ ...c, sum: list.filter((t) => t.category === c.id).reduce((s, t) => s + t.amount, 0) }))
    .filter((r) => r.sum > 0)
    .sort((a, b) => b.sum - a.sum)
  const biggest = rows[0]?.sum ?? 1

  // Needs vs wants, for spending only
  const needs = list.filter((t) => t.need === 'need').reduce((s, t) => s + t.amount, 0)
  const wants = total - needs

  return (
    <section aria-labelledby="cat-title" className="card flex h-full flex-col p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cat-title" className="flex items-center gap-2 font-semibold">
          <PieChart className="size-4.5 text-leaf" aria-hidden /> {side === 'out' ? 'Where it went' : 'Where it came from'}
        </h2>
        <div role="tablist" aria-label="Money out or in" className="relative flex rounded-full bg-wash p-1 text-sm">
          {(['out', 'in'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={side === s}
              onClick={() => {
                setSide(s)
                onPick(null)
              }}
              className={`relative z-10 rounded-full px-3 py-1 font-semibold transition-colors ${side === s ? 'text-white' : 'text-ink-soft'}`}
            >
              {side === s && <motion.span layoutId="cat-side" className="absolute inset-0 -z-10 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
              {s === 'out' ? 'Out' : 'In'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={side} initial={{ opacity: 0, x: side === 'in' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: side === 'in' ? -20 : 20 }} transition={{ duration: 0.25 }}>
          {rows.length === 0 ? (
            <p className="mt-6 text-muted">{side === 'out' ? `Nothing spent ${phrase}.` : `No money in ${phrase}.`}</p>
          ) : (
            <>
              {side === 'out' && total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span>
                      <span className="font-semibold">Needs</span> <span className="text-muted">{money(needs)}</span>
                    </span>
                    <span>
                      <span className="text-muted">{money(wants)}</span> <span className="font-semibold">Wants</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2.5 gap-[2px] overflow-hidden rounded-full" aria-hidden>
                    <motion.div className="h-full rounded-l-full bg-ink" initial={{ flexGrow: 0 }} animate={{ flexGrow: needs / total }} transition={{ duration: 0.9 }} />
                    <motion.div className="h-full rounded-r-full bg-[#9fb5a8]" initial={{ flexGrow: 0 }} animate={{ flexGrow: wants / total }} transition={{ duration: 0.9 }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {Math.round((needs / total) * 100)}% needs, {Math.round((wants / total) * 100)}% wants
                  </p>
                </div>
              )}

              {/* Composition strip: fixed category order, 2px gaps */}
              <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
                {cats.map((c) => {
                  const r = rows.find((x) => x.id === c.id)
                  if (!r) return null
                  return (
                    <motion.div
                      key={c.id}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ background: c.color }}
                      initial={{ flexGrow: 0 }}
                      animate={{ flexGrow: r.sum / total, opacity: active && active !== c.id ? 0.3 : 1 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )
                })}
              </div>

              {/* Ranked list: every value labelled, so colour never carries meaning alone */}
              <ul className="mt-4 space-y-1">
                {rows.map((r, i) => {
                  const Icon = r.icon
                  const on = active === r.id
                  return (
                    <motion.li key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                      <button
                        type="button"
                        onClick={() => onPick(on ? null : r.id)}
                        aria-pressed={on}
                        className={`group w-full rounded-2xl px-3 py-2.5 text-left transition-colors ${on ? 'bg-wash ring-1 ring-ink/10' : 'hover:bg-wash'} ${active && !on ? 'opacity-50' : ''}`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="grid size-8 shrink-0 place-items-center rounded-xl text-white transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:scale-115 group-hover:-rotate-8"
                            style={{ background: r.color }}
                          >
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <span className="flex-1 font-medium">{r.label}</span>
                          <span className="num text-sm text-muted">{Math.round((r.sum / total) * 100)}%</span>
                          <span className="num w-24 text-right font-semibold">{money(r.sum)}</span>
                        </span>
                        <span className="mt-2 ml-11 block h-1.5 rounded-full bg-line" aria-hidden>
                          <motion.span
                            className="block h-full rounded-full"
                            style={{ background: r.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(r.sum / biggest) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </span>
                      </button>
                    </motion.li>
                  )
                })}
              </ul>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
