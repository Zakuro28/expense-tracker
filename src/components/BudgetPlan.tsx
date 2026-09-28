import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, ClipboardList, PiggyBank, Scale, TriangleAlert } from 'lucide-react'
import AnimatedMoney from './AnimatedMoney'
import { CATEGORIES, money, moneyWhole, monthName, type Book, type OutCat, type Tx } from '../lib/data'

type Props = {
  book: Book
  month: string // YYYY-MM
  txs: Tx[] // this month's entries
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

export default function BudgetPlan({ book, month, txs, onBook }: Props) {
  const spentBy = (c: OutCat) => txs.filter((t) => t.type === 'out' && t.category === c).reduce((s, t) => s + t.amount, 0)
  const income = txs.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0)
  const saved = txs.filter((t) => t.type === 'save').reduce((s, t) => s + t.amount, 0)
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
          </p>
        </div>
        <p className="mt-1 text-sm text-muted">Set how much you plan to spend in each category. Bars fill as you spend.</p>

        <ul className="mt-5 space-y-3">
          {CATEGORIES.map((c, i) => {
            const id = c.id as OutCat
            const plan = book.categoryBudgets[id] ?? 0
            const s = spentBy(id)
            const pct = plan > 0 ? Math.min(s / plan, 1) : s > 0 ? 1 : 0
            const over = plan > 0 && s > plan
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
                  </div>
                  <MoneyInput value={plan} onCommit={(n) => setCat(id, n)} label={`${c.label} budget`} />
                </div>
                <div className="mt-2 ml-12 h-2 rounded-full bg-line" aria-hidden>
                  <motion.div className="h-full rounded-full" style={{ background: over ? '#d03b3b' : c.color }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.9, delay: 0.2 + i * 0.04, ease }} />
                </div>
              </motion.li>
            )
          })}
        </ul>

        {planned !== book.monthlyBudget && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-wash p-4 text-sm">
            <p>
              Your plan adds up to <b>{moneyWhole(planned)}</b>, but your monthly budget is <b>{moneyWhole(book.monthlyBudget)}</b>.
            </p>
            <button type="button" onClick={() => onBook({ monthlyBudget: planned })} className="rounded-full bg-ink px-4 py-2 font-semibold text-white">
              Use {moneyWhole(planned)} as monthly budget
            </button>
          </div>
        )}
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
            {saved >= book.monthlySavingsGoal && book.monthlySavingsGoal > 0 ? (
              <>
                <Check className="size-4 text-leaf" aria-hidden /> Goal reached. Nice work.
              </>
            ) : (
              <span className="text-ink-soft">{moneyWhole(Math.max(book.monthlySavingsGoal - saved, 0))} more to reach it this month.</span>
            )}
          </p>
          <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
            Money in <b className="text-ink">{moneyWhole(income)}</b>, spent <b className="text-ink">{moneyWhole(spent)}</b>, saved <b className="text-ink">{moneyWhole(saved)}</b>. Left over{' '}
            <b className={income - spent - saved >= 0 ? 'text-leaf' : 'text-critical'}>{moneyWhole(income - spent - saved)}</b>.
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
