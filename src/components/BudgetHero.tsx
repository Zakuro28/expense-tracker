import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion } from 'motion/react'
import { ArrowDownLeft, Check, Pencil, PiggyBank, Scale, TriangleAlert } from 'lucide-react'
import AnimatedMoney from './AnimatedMoney'
import { addDays, fromISO, moneyWhole, periodPhrase, rangeOf, todayISO, type Period } from '../lib/data'

type Props = {
  period: Period
  anchor: string
  out: number
  /** Spending that uses up the budget (goal-funded parts left out) */
  budgetOut: number
  inn: number
  saved: number
  /** Money taken back out of goals to pay for things */
  fromGoals: number
  /** This month's wishlist, set aside from the budget */
  reserved: number
  count: number
  budget: number | null
  /** Which budget the bar uses; only these two are directly editable */
  budgetKind: 'weekly' | 'monthly' | 'derived' | null
  onBudget: (n: number) => void
  pulse: number
}

const dayCount = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000) + 1

export default function BudgetHero({ period, anchor, out, budgetOut, inn, saved, fromGoals, reserved, count, budget, budgetKind, onBudget, pulse }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(budget ?? ''))
  const inputRef = useRef<HTMLInputElement>(null)
  const totalRef = useRef<HTMLParagraphElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.select(), 30)
  }, [editing])

  // The total swells and glows when a new entry lands in it
  useEffect(() => {
    if (!pulse || !totalRef.current) return
    animate(
      totalRef.current,
      { scale: [1, 1.05, 1], textShadow: ['0 0 0 rgba(201,242,107,0)', '0 0 40px rgba(201,242,107,0.75)', '0 0 0 rgba(201,242,107,0)'] },
      { duration: 0.7, ease: 'easeOut' },
    )
  }, [pulse])

  const r = rangeOf(period, anchor)
  const today = todayISO()
  const isCurrent = today >= r.start && today <= r.end
  const total = dayCount(r.start, r.end)
  const elapsed = isCurrent ? dayCount(r.start, today) : today > r.end ? total : 0
  const pace = elapsed / total
  const daysLeft = total - elapsed
  // What's left after spending and saving; money taken back out of goals comes back in
  const net = inn - out - saved + fromGoals

  const left = budget !== null ? budget - budgetOut : 0
  const over = budget !== null && left < 0
  const pct = budget ? Math.min(budgetOut / budget, 1) : 0
  // Planned wishlist money for this month, shown as a striped part of the bar
  const held = budget && !over ? Math.min(reserved, left) : 0
  const heldPct = budget ? held / budget : 0
  const free = left - held
  // The status follows the bar: caution as soon as spending passes the Today marker
  const aheadOfPace = isCurrent && period !== 'day' && !over && pct > pace + 0.01
  const perDay = daysLeft > 0 ? Math.max(free, 0) / daysLeft : 0
  const funded = out - budgetOut

  // Shake once the moment spending crosses the budget
  const wasOver = useRef(over)
  useEffect(() => {
    if (over && !wasOver.current && barRef.current) animate(barRef.current, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.5 })
    wasOver.current = over
  }, [over])

  const commit = () => {
    const n = Number(draft.replace(/[^\d.]/g, ''))
    if (n > 0) onBudget(Math.round(n))
    setEditing(false)
  }

  const phrase = periodPhrase(period, anchor)
  const budgetName = budgetKind === 'weekly' ? 'Weekly budget' : budgetKind === 'monthly' ? 'Monthly budget' : period === 'day' ? 'Daily share' : 'Yearly budget'

  return (
    <section aria-labelledby="spent-label">
      <p id="spent-label" className="text-cream/70">
        Spent {phrase}
        <span className="text-cream/45"> across {count} {count === 1 ? 'entry' : 'entries'}</span>
      </p>
      <p id="hero-total" ref={totalRef} className="mt-1 inline-block origin-left text-[clamp(3rem,9vw,6.2rem)] leading-none font-extrabold tracking-[-0.04em] text-white">
        <AnimatedMoney value={out} />
      </p>
      {funded > 0 && (
        <p className="mt-2 flex items-center gap-2 text-sm text-cream/70">
          <PiggyBank className="size-4 text-lime" aria-hidden />
          {moneyWhole(funded)} of this came from your savings goals, so it doesn’t count against your budget.
        </p>
      )}

      {/* Money in and net, side by side */}
      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        <p className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gold/20 text-gold">
            <ArrowDownLeft className="size-4.5" aria-hidden />
          </span>
          <span>
            <span className="block text-xs text-cream/55">Money in</span>
            <AnimatedMoney value={inn} whole className="text-lg font-bold text-white" />
          </span>
        </p>
        <p className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-cream">
            <PiggyBank className="size-4.5" aria-hidden />
          </span>
          <span>
            <span className="block text-xs text-cream/55">Saved</span>
            <AnimatedMoney value={saved} whole className="text-lg font-bold text-white" />
          </span>
        </p>
        <p className="flex items-center gap-2.5">
          <span className={`grid size-9 place-items-center rounded-xl ${net >= 0 ? 'bg-lime/20 text-lime' : 'bg-critical/25 text-[#ffb4a8]'}`}>
            <Scale className="size-4.5" aria-hidden />
          </span>
          <span>
            <span className="block text-xs text-cream/55">Left over</span>
            <span className={`text-lg font-bold ${net >= 0 ? 'text-lime' : 'text-[#ffb4a8]'}`}>
              {net >= 0 ? '+' : '−'}
              <AnimatedMoney value={Math.abs(net)} whole />
            </span>
          </span>
        </p>
      </div>

      {budget !== null && (
        <div className="mt-8 max-w-2xl">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              {over ? (
                <p className="flex items-center gap-2 text-lg font-semibold text-[#ffb4a8]">
                  <TriangleAlert className="size-5" aria-hidden />
                  Over by {moneyWhole(-left)}
                </p>
              ) : reserved > left ? (
                <>
                  <p className="text-lg">
                    <span className="font-semibold text-lime">{moneyWhole(left)} left</span>
                    <span className="text-cream/65"> of your {budgetName.toLowerCase()}</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gold">
                    <TriangleAlert className="size-4" aria-hidden />
                    This month’s wishlist needs {moneyWhole(reserved)}, {moneyWhole(reserved - left)} more than what’s left.
                  </p>
                </>
              ) : held > 0 ? (
                <p className="text-lg">
                  <span className="font-semibold text-lime">{moneyWhole(free)} free to spend</span>
                  <span className="text-cream/65"> after {moneyWhole(held)} set aside for this month’s wishlist</span>
                </p>
              ) : (
                <p className="text-lg">
                  <span className="font-semibold text-lime">{moneyWhole(left)} left</span>
                  <span className="text-cream/65"> of your {budgetName.toLowerCase()}</span>
                </p>
              )}
              {isCurrent && !over && free > 0 && daysLeft > 0 && period !== 'day' && (
                <p className="text-sm text-cream/60">
                  That’s {moneyWhole(perDay)} a day for the next {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                </p>
              )}
              {!isCurrent && held > 0 && <p className="text-sm text-cream/60">Wishlist items planned for this month are set aside from the budget.</p>}
            </div>

            <div className="flex items-center gap-2 text-sm text-cream/70">
              {budgetName}
              {budgetKind === 'weekly' || budgetKind === 'monthly' ? (
                <AnimatePresence mode="wait" initial={false}>
                  {editing ? (
                    <motion.form
                      key="edit"
                      initial={{ opacity: 0, width: 80 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0 }}
                      onSubmit={(e) => {
                        e.preventDefault()
                        commit()
                      }}
                      className="flex items-center gap-1 rounded-full bg-white/10 py-1 pr-1 pl-3"
                    >
                      <span aria-hidden>₱</span>
                      <input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
                        inputMode="decimal"
                        aria-label={`${budgetName} in pesos`}
                        className="num w-24 bg-transparent font-semibold text-white outline-none"
                      />
                      <button type="submit" aria-label="Save budget" className="grid size-7 place-items-center rounded-full bg-lime text-note">
                        <Check className="size-4" />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.button
                      key="show"
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => {
                        setDraft(String(budget ?? ''))
                        setEditing(true)
                      }}
                      className="group flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-white/15"
                    >
                      {moneyWhole(budget)}
                      <Pencil className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
                      <span className="sr-only">Edit {budgetName.toLowerCase()}</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white">{moneyWhole(budget)}</span>
              )}
            </div>
          </div>

          <div ref={barRef} className="relative mt-4 h-4 rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={Math.round(budgetOut)} aria-label="Budget used">
            <motion.div
              className={`shimmer absolute inset-y-0 left-0 overflow-hidden rounded-full transition-colors duration-700 ${over ? 'bg-critical' : aheadOfPace ? 'bg-gold' : 'bg-lime'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 1.3, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Set aside for the wishlist: striped, right after what's been spent */}
            {heldPct > 0 && (
              <motion.div
                className="absolute inset-y-0 rounded-r-full bg-[repeating-linear-gradient(135deg,rgba(201,242,107,0.55)_0_5px,rgba(201,242,107,0.18)_5px_10px)]"
                initial={{ left: 0, width: 0 }}
                animate={{ left: `calc(${pct * 100}% + 2px)`, width: `max(calc(${heldPct * 100}% - 2px), 0px)` }}
                transition={{ duration: 1.3, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                title={`${moneyWhole(held)} set aside for this month’s wishlist`}
              />
            )}
            {isCurrent && period !== 'day' && (
              <motion.div
                className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded-full bg-white"
                initial={{ left: 0, opacity: 0 }}
                animate={{ left: `${pace * 100}%`, opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={`absolute top-full mt-2 text-xs whitespace-nowrap text-cream/60 ${pace > 0.9 ? 'right-0' : pace < 0.1 ? 'left-0' : 'left-1/2 -translate-x-1/2'}`}>Today</span>
              </motion.div>
            )}
          </div>
          {isCurrent && period !== 'day' && (
            <p className="mt-8 flex items-center gap-2 text-sm text-cream/70">
              {aheadOfPace ? (
                <>
                  <TriangleAlert className="size-4 text-gold" aria-hidden />
                  You’re spending faster than your budget allows. Ease off a little to finish on target.
                </>
              ) : over ? null : (
                <>
                  <Check className="size-4 text-lime" aria-hidden />
                  You’re on track {phrase}.
                </>
              )}
            </p>
          )}
          {period === 'day' && isCurrent && (
            <p className="mt-3 text-sm text-cream/60">Your daily share is your monthly budget spread over the month. Tomorrow starts {fromISO(addDays(today, 1)).toLocaleDateString('en-US', { weekday: 'long' })}.</p>
          )}
        </div>
      )}
    </section>
  )
}
