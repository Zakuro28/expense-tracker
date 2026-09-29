import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, ClipboardList, Gift, PiggyBank, Scale, Target, TriangleAlert } from 'lucide-react'
import AnimatedMoney from './AnimatedMoney'
import { CATEGORIES, goalsMonthlyNeed, money, moneyWhole, monthKey, monthName, savedInto, takenFromGoals, todayISO, wishlistReserve, type Book, type Goal, type OutCat, type Tx, type Wish } from '../lib/data'

type Props = {
  book: Book
  month: string // YYYY-MM
  txs: Tx[] // this month's entries
  allTxs: Tx[] // every entry in the book, for goal balances
  goals: Goal[]
  wishes: Wish[]
  onBook: (patch: Partial<Book>) => void
}

const ease = [0.16, 1, 0.3, 1] as const

function MoneyInput({ value, onCommit, label }: { value: number; onCommit: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="flex items-center gap-1 rounded-xl border border-line bg-wash px-2.5 focus-within:border-leaf focus-within:bg-white">
      <span className="text-sm text-muted" aria-hidden>
        ₱
      </span>
      <input
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          if (draft !== null) onCommit(Number(draft) || 0)
          setDraft(null)
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        inputMode="numeric"
        aria-label={label}
        className="num h-9 w-20 bg-transparent text-right font-semibold outline-none"
      />
    </label>
  )
}

export default function BudgetPlan({ book, month, txs, allTxs, goals, wishes, onBook }: Props) {
  // Goal-funded parts of purchases were saved for earlier, so they don't use up a category plan
  const spentBy = (c: OutCat) => txs.filter((t) => t.type === 'out' && t.category === c).reduce((s, t) => s + t.amount - Math.min(t.goalFunded ?? 0, t.amount), 0)
  const income = txs.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const saved = savedInto(txs)
  const fromGoals = takenFromGoals(txs)
  // Wishlist items planned for this month (only this month or later)
  const reserve = month >= monthKey(todayISO()) ? wishlistReserve(wishes, goals, allTxs, month) : { total: 0, byCategory: {} as Partial<Record<OutCat, number>> }
  // What goals with a target date need saved each month
  const goalsNeed = Math.ceil(goalsMonthlyNeed(goals, allTxs, month))
  const needs = txs.filter((t) => t.type === 'out' && t.need === 'need').reduce((s, t) => s + t.amount, 0)
  const wants = txs.filter((t) => t.type === 'out' && t.need !== 'need').reduce((s, t) => s + t.amount, 0)
  const planned = CATEGORIES.reduce((s, c) => s + (book.categoryBudgets[c.id as OutCat] ?? 0), 0)
  const spent = needs + wants

  const setCat = (c: OutCat, n: number) => onBook({ categoryBudgets: { ...book.categoryBudgets, [c]: n } })

  // 50/30/20: needs, wants, savings as a share of this month's income
  const rule = [
    { label: 'Needs', target: 0.5, actual: needs, hint: 'Rent, bills, food, transport, health' },
    { label: 'Wants', target: 0.3, actual: wants, hint: 'Shopping, fun, eating out' },
    { label: 'Savings', target: 0.2, actual: saved, hint: 'Money moved to your goals' },
  ]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12 lg:gap-5">
      {/* Category plan */}
      <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="card p-5 sm:p-7 lg:col-span-7" aria-labelledby="plan-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="plan-title" className="flex items-center gap-2 font-semibold">
            <ClipboardList className="size-4.5 text-leaf" aria-hidden /> {monthName(month)} budget plan
          </h2>
          <p className="text-sm text-muted">
            Planned <span className="font-semibold text-ink">{moneyWhole(planned)}</span>, spent <span className="font-semibold text-ink">{moneyWhole(spent)}</span>
            {reserve.total > 0 && (
              <>
                , wishlist <span className="font-semibold text-ink">{moneyWhole(reserve.total)}</span>
              </>
            )}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted">Set how much you plan to spend in each category. Bars fill as you spend; striped parts are wishlist plans.</p>

        {/* Category plans and the monthly budget should agree */}
        {planned > book.monthlyBudget ? (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fde8e6] p-4 text-sm text-critical">
            <p className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Your category plans add up to <b>{moneyWhole(planned)}</b>, which is <b>{moneyWhole(planned - book.monthlyBudget)} more</b> than your {moneyWhole(book.monthlyBudget)} monthly budget. Raise the budget or trim a plan below.
              </span>
            </p>
            <button type="button" onClick={() => onBook({ monthlyBudget: planned })} className="rounded-full bg-critical px-4 py-2 font-semibold text-white">
              Raise budget to {moneyWhole(planned)}
            </button>
          </div>
        ) : planned < book.monthlyBudget ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wash p-4 text-sm">
            <p>
              <b>{moneyWhole(book.monthlyBudget - planned)}</b> of your {moneyWhole(book.monthlyBudget)} monthly budget isn’t planned for any category yet.
            </p>
            <button type="button" onClick={() => onBook({ monthlyBudget: planned })} className="rounded-full bg-ink px-4 py-2 font-semibold text-white">
              Lower budget to {moneyWhole(planned)}
            </button>
          </div>
        ) : null}

        <ul className="mt-5 space-y-3">
          {CATEGORIES.map((c, i) => {
            const id = c.id as OutCat
            const plan = book.categoryBudgets[id] ?? 0
            const s = spentBy(id)
            const wish = reserve.byCategory[id] ?? 0
            const pct = plan > 0 ? Math.min(s / plan, 1) : s > 0 ? 1 : 0
            const wishPct = plan > 0 ? Math.min(wish / plan, 1 - pct) : 0
            const over = plan > 0 && s > plan
            // Warn before a planned purchase would push the category past its plan
            const willOver = plan > 0 && !over && s + wish > plan
            const Icon = c.icon
            return (
              <motion.li key={c.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04, duration: 0.4 }} className="rounded-2xl p-2 transition-colors hover:bg-wash">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: c.color }}>
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {c.label}
                      <span className={`rounded-full px-1.5 text-[11px] font-semibold ${c.need === 'need' ? 'bg-ink/8 text-ink-soft' : 'bg-gold/20 text-[#8a5d00]'}`}>{c.need === 'need' ? 'Need' : 'Want'}</span>
                    </p>
                    <p className={`text-sm ${over ? 'font-medium text-critical' : 'text-muted'}`}>
                      {over ? (
                        <span className="inline-flex items-center gap-1">
                          <TriangleAlert className="size-3.5" aria-hidden /> {money(s - plan)} over
                        </span>
                      ) : plan > 0 ? (
                        `${money(s)} spent, ${money(plan - s)} left`
                      ) : (
                        `${money(s)} spent, no plan yet`
                      )}
                    </p>
                    {wish > 0 && (
                      <p className={`flex items-center gap-1 text-xs ${willOver ? 'font-medium text-[#8a5d00]' : 'text-muted'}`}>
                        <Gift className="size-3.5" aria-hidden />
                        {money(wish)} planned on your wishlist
                        {willOver && `, which takes it ${money(s + wish - plan)} over plan`}
                      </p>
                    )}
                  </div>
                  <MoneyInput value={plan} onCommit={(n) => setCat(id, n)} label={`${c.label} budget`} />
                </div>
                <div className="mt-2 ml-12 flex h-2 gap-[2px] rounded-full bg-line" aria-hidden>
                  <motion.div className="h-full rounded-full" style={{ background: over ? '#d03b3b' : c.color }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, delay: 0.2 + i * 0.04, ease }} />
                  {wishPct > 0 && (
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `repeating-linear-gradient(135deg, ${willOver ? '#eda100' : c.color} 0 4px, transparent 4px 7px)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${wishPct * 100}%` }}
                      transition={{ duration: 0.9, delay: 0.35 + i * 0.04, ease }}
                    />
                  )}
                </div>
              </motion.li>
            )
          })}
        </ul>

      </motion.section>

      <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-5">
        {/* Savings goal for the month */}
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="card p-5 sm:p-7" aria-labelledby="save-goal">
          <div className="flex items-center justify-between gap-3">
            <h2 id="save-goal" className="flex items-center gap-2 font-semibold">
              <PiggyBank className="size-4.5 text-leaf" aria-hidden /> Monthly savings goal
            </h2>
            <MoneyInput value={book.monthlySavingsGoal} onCommit={(n) => onBook({ monthlySavingsGoal: n })} label="Monthly savings goal" />
          </div>
          <p className="mt-4 text-4xl font-extrabold tracking-tight">
            <AnimatedMoney value={saved} whole />
          </p>
          <p className="text-sm text-muted">saved in {monthName(month)} of {moneyWhole(book.monthlySavingsGoal)}</p>
          <div className="mt-3 h-3 rounded-full bg-line" aria-hidden>
            <motion.div
              className="shimmer relative h-full overflow-hidden rounded-full bg-leaf"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(book.monthlySavingsGoal ? saved / book.monthlySavingsGoal : 0, 1) * 100}%` }}
              transition={{ duration: 1.1, ease }}
            />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm">
            {saved >= book.monthlySavingsGoal && book.monthlySavingsGoal > 0 && saved >= goalsNeed ? (
              <>
                <Check className="size-4 text-leaf" aria-hidden /> Goal reached. Nice work.
              </>
            ) : saved >= book.monthlySavingsGoal && book.monthlySavingsGoal > 0 ? (
              <span className="text-ink-soft">You hit this goal, but your dated goals need {moneyWhole(goalsNeed - saved)} more this month.</span>
            ) : (
              <span className="text-ink-soft">{moneyWhole(Math.max(book.monthlySavingsGoal - saved, 0))} more to reach it this month.</span>
            )}
          </p>

          {/* Goals with a target date need a set amount each month */}
          {goalsNeed > 0 && (
            <div className={`mt-3 rounded-xl p-3 text-sm ${goalsNeed > book.monthlySavingsGoal ? 'bg-gold/15 text-[#6b4a00]' : 'bg-wash text-ink-soft'}`}>
              <p className="flex items-start gap-2">
                <Target className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Your goals with a target date need <b>{moneyWhole(goalsNeed)} a month</b> to stay on schedule
                  {goalsNeed > book.monthlySavingsGoal ? `, ${moneyWhole(goalsNeed - book.monthlySavingsGoal)} more than this monthly goal.` : '. This monthly goal covers it.'}
                </span>
              </p>
              {goalsNeed > book.monthlySavingsGoal && (
                <button type="button" onClick={() => onBook({ monthlySavingsGoal: goalsNeed })} className="mt-2 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white">
                  Set monthly goal to {moneyWhole(goalsNeed)}
                </button>
              )}
            </div>
          )}

          <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
            Money in <b className="text-ink">{moneyWhole(income)}</b>, spent <b className="text-ink">{moneyWhole(spent)}</b>, saved <b className="text-ink">{moneyWhole(saved)}</b>
            {fromGoals > 0 && (
              <>
                , taken from goals <b className="text-ink">{moneyWhole(fromGoals)}</b>
              </>
            )}
            . Left over <b className={income - spent - saved + fromGoals >= 0 ? 'text-leaf' : 'text-critical'}>{moneyWhole(income - spent - saved + fromGoals)}</b>.
          </p>
        </motion.section>

        {/* 50 / 30 / 20 */}
        <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }} className="card p-5 sm:p-7" aria-labelledby="rule-title">
          <h2 id="rule-title" className="flex items-center gap-2 font-semibold">
            <Scale className="size-4.5 text-leaf" aria-hidden /> Needs, wants and savings
          </h2>
          <p className="mt-1 text-sm text-muted">The 50/30/20 guide, measured against {income > 0 ? `your ${moneyWhole(income)} income this month` : 'your income (none recorded yet)'}.</p>
          <ul className="mt-4 space-y-4">
            {rule.map((r, i) => {
              const target = income * r.target
              const share = income > 0 ? r.actual / income : 0
              const good = r.label === 'Savings' ? r.actual >= target : r.actual <= target
              return (
                <li key={r.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>
                      <b>{r.label}</b> <span className="text-muted">aim {Math.round(r.target * 100)}%</span>
                    </span>
                    <span className={good ? 'font-semibold text-leaf' : 'font-semibold text-[#b45309]'}>{Math.round(share * 100)}%</span>
                  </div>
                  <div className="relative mt-1.5 h-2.5 rounded-full bg-line" aria-hidden>
                    <motion.div className={`h-full rounded-full ${r.label === 'Needs' ? 'bg-ink' : r.label === 'Wants' ? 'bg-[#9fb5a8]' : 'bg-leaf'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(share, 1) * 100}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1, ease }} />
                    <span className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink/60" style={{ left: `${r.target * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {money(r.actual)} of {money(target)}. {r.hint}.
                  </p>
                </li>
              )
            })}
          </ul>
        </motion.section>
      </div>
    </div>
  )
}
