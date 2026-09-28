import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Gift, Pencil, PiggyBank, Plus, ShoppingCart, Target, Trash2, X } from 'lucide-react'
import AnimatedMoney from './AnimatedMoney'
import {
  CAT,
  CATEGORIES,
  GOAL_COLORS,
  fromISO,
  goalSaved,
  monthKey,
  monthLabel,
  money,
  moneyWhole,
  shiftMonth,
  todayISO,
  uid,
  type Goal,
  type Need,
  type OutCat,
  type Tx,
  type Wish,
} from '../lib/data'

type Props = {
  goals: Goal[]
  wishes: Wish[]
  txs: Tx[] // all entries in the book
  monthlySavingsGoal: number
  onGoals: (g: Goal[]) => void
  onWishes: (w: Wish[]) => void
  onAddMoney: (goalId: string) => void
  onBuy: (w: Wish) => void
}

const ease = [0.16, 1, 0.3, 1] as const
const field = 'mt-1 h-11 w-full rounded-xl border border-line bg-wash px-3 outline-none focus:border-leaf focus:bg-white'

function monthsBetween(fromMonth: string, toMonth: string) {
  const [a, b] = [fromMonth.split('-').map(Number), toMonth.split('-').map(Number)]
  return (b[0] - a[0]) * 12 + (b[1] - a[1])
}

/* ---------- Progress ring ---------- */
function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 72 72" className="size-18 shrink-0 -rotate-90" aria-hidden>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e2eadf" strokeWidth="7" />
      <motion.circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(pct, 1)) }} transition={{ duration: 1.3, ease }} />
      <text x="36" y="36" textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-ink text-[15px] font-bold" style={{ transformOrigin: '36px 36px' }}>
        {Math.round(Math.min(pct, 1) * 100)}%
      </text>
    </svg>
  )
}

function GoalForm({ initial, onSave, onCancel, count }: { initial?: Goal; onSave: (g: Goal) => void; onCancel: () => void; count: number }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target) : '')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [error, setError] = useState('')
  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        const t = Number(target.replace(/,/g, ''))
        if (!name.trim()) return setError('Name your goal, like “Emergency fund”.')
        if (!(t > 0)) return setError('Enter how much you want to save.')
        onSave({ id: initial?.id ?? uid(), name: name.trim(), target: t, deadline: deadline || undefined, color: initial?.color ?? GOAL_COLORS[count % GOAL_COLORS.length] })
      }}
    >
      <div className="mt-4 grid gap-3 rounded-2xl bg-wash/60 p-4 ring-1 ring-line sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <span className="text-sm text-muted">Goal</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency fund, new phone, trip…" className={field} autoFocus />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Goal amount</span>
          <input value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm text-muted">Reach it by (optional)</span>
          <input type="month" value={deadline} min={monthKey(todayISO())} onChange={(e) => setDeadline(e.target.value)} className={field} />
        </label>
        {error && <p className="text-sm font-medium text-critical sm:col-span-3">{error}</p>}
        <div className="flex gap-2 sm:col-span-3">
          <button type="submit" className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-white">
            <Check className="size-4 text-lime" /> {initial ? 'Save goal' : 'Add goal'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2.5 font-medium text-ink-soft hover:bg-line">
            Cancel
          </button>
        </div>
      </div>
    </motion.form>
  )
}

function WishForm({ goals, onSave, onCancel }: { goals: Goal[]; onSave: (w: Wish) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [need, setNeed] = useState<Need>('want')
  const [category, setCategory] = useState<OutCat>('shopping')
  const [month, setMonth] = useState(shiftMonth(monthKey(todayISO()), 1))
  const [goalId, setGoalId] = useState('')
  const [error, setError] = useState('')
  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        const p = Number(price.replace(/,/g, ''))
        if (!name.trim()) return setError('What do you want to buy?')
        if (!(p > 0)) return setError('Enter the price.')
        onSave({ id: uid(), name: name.trim(), price: p, need, category, month, goalId: goalId || undefined })
      }}
    >
      <div className="mt-4 grid gap-3 rounded-2xl bg-wash/60 p-4 ring-1 ring-line sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm text-muted">Item</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Running shoes, new phone…" className={field} autoFocus />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Price</span>
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0" className={field} />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Planned for</span>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Category when bought</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as OutCat)} className={field}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">Save for it in</span>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className={field}>
            <option value="">No goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <span className="text-sm text-muted">This is a</span>
          <div className="relative flex rounded-full bg-wash p-1 ring-1 ring-line">
            {(['need', 'want'] as const).map((n) => (
              <button key={n} type="button" aria-pressed={need === n} onClick={() => setNeed(n)} className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${need === n ? 'text-white' : 'text-ink-soft'}`}>
                {need === n && <motion.span layoutId="wish-need" className="absolute inset-0 -z-10 rounded-full bg-ink" />}
                {n}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm font-medium text-critical sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-white">
            <Check className="size-4 text-lime" /> Add to wishlist
          </button>
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2.5 font-medium text-ink-soft hover:bg-line">
            Cancel
          </button>
        </div>
      </div>
    </motion.form>
  )
}

export default function Goals({ goals, wishes, txs, monthlySavingsGoal, onGoals, onWishes, onAddMoney, onBuy }: Props) {
  const [addingGoal, setAddingGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [addingWish, setAddingWish] = useState(false)
  const [wishFilter, setWishFilter] = useState<Need | 'all'>('all')

  const thisMonth = monthKey(todayISO())
  const savedThisMonth = txs.filter((t) => t.type === 'save' && monthKey(t.date) === thisMonth).reduce((s, t) => s + t.amount, 0)
  const totalSaved = goals.reduce((s, g) => s + goalSaved(g.id, txs), 0)

  // Wishlist grouped by planned month, earliest first; bought items sink to the end
  const shown = wishes.filter((w) => wishFilter === 'all' || w.need === wishFilter)
  const byMonth = [...new Set(shown.map((w) => w.month))].sort()

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12 lg:gap-5">
      {/* Savings summary on the green */}
      <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="rounded-[28px] bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-md lg:col-span-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-cream/70">Saved across all goals</p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight text-white">
              <AnimatedMoney value={totalSaved} whole />
            </p>
          </div>
          <div className="min-w-64 flex-1 sm:max-w-md">
            <div className="flex justify-between text-sm">
              <span className="text-cream/70">This month’s savings goal</span>
              <span className="font-semibold text-white">
                {moneyWhole(savedThisMonth)} of {moneyWhole(monthlySavingsGoal)}
              </span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-white/10" aria-hidden>
              <motion.div className="shimmer relative h-full overflow-hidden rounded-full bg-lime" initial={{ width: 0 }} animate={{ width: `${Math.min(monthlySavingsGoal ? savedThisMonth / monthlySavingsGoal : 0, 1) * 100}%` }} transition={{ duration: 1.1, ease }} />
            </div>
            <p className="mt-1.5 text-xs text-cream/55">Change the monthly goal on the Budget plan tab.</p>
          </div>
        </div>
      </motion.section>

      {/* Goals */}
      <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="card p-5 sm:p-7 lg:col-span-6" aria-labelledby="goals-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="goals-title" className="flex items-center gap-2 font-semibold">
            <Target className="size-4.5 text-leaf" aria-hidden /> Savings goals
          </h2>
          <button type="button" onClick={() => { setAddingGoal((v) => !v); setEditingGoal(null) }} className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
            {addingGoal ? <X className="size-4" /> : <Plus className="size-4" />} {addingGoal ? 'Close' : 'New goal'}
          </button>
        </div>
        <AnimatePresence>{addingGoal && <GoalForm key="new" count={goals.length} onSave={(g) => { onGoals([...goals, g]); setAddingGoal(false) }} onCancel={() => setAddingGoal(false)} />}</AnimatePresence>

        {goals.length === 0 && !addingGoal ? (
          <p className="py-10 text-center text-muted">Set a goal amount, then move money into it. Progress follows what you actually save.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {goals.map((g, i) => {
                const saved = goalSaved(g.id, txs)
                const pct = saved / g.target
                const left = Math.max(g.target - saved, 0)
                const monthsLeft = g.deadline ? Math.max(monthsBetween(thisMonth, g.deadline) + 1, 1) : null
                const linked = wishes.filter((w) => w.goalId === g.id && !w.boughtTxId)
                return (
                  <motion.li key={g.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.06, duration: 0.45 }} className="group rounded-2xl p-3 ring-1 ring-line transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <Ring pct={pct} color={g.color} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-semibold">
                          <span className="size-2.5 rounded-full" style={{ background: g.color }} aria-hidden />
                          {g.name}
                          {pct >= 1 && <span className="rounded-full bg-leaf/12 px-2 text-xs font-semibold text-leaf">Reached</span>}
                        </p>
                        <p className="text-sm">
                          <b>{money(saved)}</b> <span className="text-muted">of {money(g.target)}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {pct >= 1
                            ? 'Goal reached.'
                            : monthsLeft
                              ? `Save ${moneyWhole(left / monthsLeft)} a month to reach it by ${monthLabel(g.deadline!)}.`
                              : `${moneyWhole(left)} to go.`}
                          {linked.length > 0 && ` For: ${linked.map((w) => w.name).join(', ')}.`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => onAddMoney(g.id)} className="flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-sm font-bold text-note">
                        <PiggyBank className="size-4" /> Add money
                      </motion.button>
                      <span className="ml-auto flex gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button type="button" onClick={() => { setEditingGoal(g.id); setAddingGoal(false) }} aria-label={`Edit ${g.name}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-line hover:text-ink">
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => window.confirm(`Delete the “${g.name}” goal? Money you moved into it stays in your entries as savings.`) && onGoals(goals.filter((x) => x.id !== g.id))}
                          aria-label={`Delete ${g.name}`}
                          className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#fde8e6] hover:text-critical"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </span>
                    </div>
                    <AnimatePresence>
                      {editingGoal === g.id && (
                        <GoalForm key="edit" initial={g} count={goals.length} onSave={(ng) => { onGoals(goals.map((x) => (x.id === ng.id ? ng : x))); setEditingGoal(null) }} onCancel={() => setEditingGoal(null)} />
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </motion.section>

      {/* Wishlist */}
      <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }} className="card p-5 sm:p-7 lg:col-span-6" aria-labelledby="wish-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="wish-title" className="flex items-center gap-2 font-semibold">
            <Gift className="size-4.5 text-leaf" aria-hidden /> Wishlist
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-wash p-1 text-sm">
              {(['all', 'need', 'want'] as const).map((f) => (
                <button key={f} type="button" aria-pressed={wishFilter === f} onClick={() => setWishFilter(f)} className={`relative z-10 rounded-full px-3 py-1 font-semibold capitalize ${wishFilter === f ? 'text-white' : 'text-ink-soft'}`}>
                  {wishFilter === f && <motion.span layoutId="wish-filter" className="absolute inset-0 -z-10 rounded-full bg-ink" />}
                  {f === 'all' ? 'All' : `${f}s`}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setAddingWish((v) => !v)} aria-label={addingWish ? 'Close' : 'Add to wishlist'} className="grid size-9 place-items-center rounded-full bg-ink text-white">
              {addingWish ? <X className="size-4" /> : <Plus className="size-4" />}
            </button>
          </div>
        </div>
        <AnimatePresence>{addingWish && <WishForm key="wish" goals={goals} onSave={(w) => { onWishes([...wishes, w]); setAddingWish(false) }} onCancel={() => setAddingWish(false)} />}</AnimatePresence>

        {shown.length === 0 && !addingWish ? (
          <p className="py-10 text-center text-muted">Add things you’re planning to buy. Mark each as a need or want, and link it to a goal to see when you can afford it.</p>
        ) : (
          <div className="mt-2">
            {byMonth.map((m) => (
              <div key={m} className="pt-3">
                <h3 className="border-b border-line pb-2 text-sm font-semibold text-ink-soft">
                  {monthLabel(m)}
                  <span className="ml-2 font-normal text-muted">{money(shown.filter((w) => w.month === m && !w.boughtTxId).reduce((s, w) => s + w.price, 0))} planned</span>
                </h3>
                <ul>
                  <AnimatePresence initial={false}>
                    {shown
                      .filter((w) => w.month === m)
                      .sort((a, b) => Number(Boolean(a.boughtTxId)) - Number(Boolean(b.boughtTxId)))
                      .map((w) => {
                        const c = CAT[w.category]
                        const Icon = c.icon
                        const goal = goals.find((g) => g.id === w.goalId)
                        const saved = goal ? goalSaved(goal.id, txs) : 0
                        const ready = goal ? Math.min(saved / w.price, 1) : null
                        const bought = Boolean(w.boughtTxId)
                        const bTx = bought ? txs.find((t) => t.id === w.boughtTxId) : undefined
                        return (
                          <motion.li key={w.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: bought ? 0.55 : 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-wash">
                            <span className="grid size-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: c.color }}>
                              <Icon className="size-4.5" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`flex flex-wrap items-center gap-2 font-medium ${bought ? 'line-through' : ''}`}>
                                {w.name}
                                <span className={`rounded-full px-1.5 text-[11px] font-semibold no-underline ${w.need === 'need' ? 'bg-ink/8 text-ink-soft' : 'bg-gold/20 text-[#8a5d00]'}`}>{w.need === 'need' ? 'Need' : 'Want'}</span>
                              </p>
                              {bought ? (
                                <p className="text-sm text-muted">Bought{bTx ? ` on ${fromISO(bTx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}, added to {c.label}</p>
                              ) : goal ? (
                                <>
                                  <p className="text-sm text-muted">
                                    {ready! >= 1 ? `Your ${goal.name} goal can cover it` : `${moneyWhole(w.price - saved)} more in ${goal.name}`}
                                  </p>
                                  <div className="mt-1 h-1.5 max-w-48 rounded-full bg-line" aria-hidden>
                                    <motion.div className="h-full rounded-full" style={{ background: goal.color }} initial={{ width: 0 }} animate={{ width: `${ready! * 100}%` }} transition={{ duration: 0.9, ease }} />
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-muted">{c.label}, not linked to a goal</p>
                              )}
                            </div>
                            <span className="num font-semibold">{money(w.price)}</span>
                            {!bought && (
                              <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => onBuy(w)} className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white">
                                <ShoppingCart className="size-4 text-lime" /> Buy
                              </motion.button>
                            )}
                            <button type="button" onClick={() => onWishes(wishes.filter((x) => x.id !== w.id))} aria-label={`Remove ${w.name}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#fde8e6] hover:text-critical sm:opacity-0 sm:group-hover:opacity-100">
                              <Trash2 className="size-4" />
                            </button>
                          </motion.li>
                        )
                      })}
                  </AnimatePresence>
                </ul>
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  )
}
