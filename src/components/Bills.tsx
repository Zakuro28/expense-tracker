import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlarmClock, CalendarClock, Check, CircleCheck, Pencil, Plus, Trash2, Undo2, X } from 'lucide-react'
import { ACC, ACCOUNTS, CAT, CATEGORIES, billStatuses, fromISO, money, monthName, todayISO, uid, type AccountId, type Bill, type BillStatus, type OutCat, type Tx } from '../lib/data'

type Props = {
  month: string
  bills: Bill[]
  txs: Tx[] // all entries in the book
  onBills: (b: Bill[]) => void
  onPay: (s: BillStatus) => void
  onUnpay: (tx: Tx) => void
}

const ease = [0.16, 1, 0.3, 1] as const

const STATE = {
  paid: { label: 'Paid', cls: 'bg-leaf/12 text-leaf', icon: CircleCheck },
  overdue: { label: 'Overdue', cls: 'bg-critical/12 text-critical', icon: AlarmClock },
  soon: { label: 'Due soon', cls: 'bg-gold/25 text-[#8a5d00]', icon: CalendarClock },
  upcoming: { label: 'Upcoming', cls: 'bg-ink/6 text-ink-soft', icon: CalendarClock },
} as const

function when(due: string) {
  const d = Math.round((fromISO(due).getTime() - fromISO(todayISO()).getTime()) / 86400000)
  if (d === 0) return 'Due today'
  if (d === 1) return 'Due tomorrow'
  if (d > 1) return `Due in ${d} days`
  return d === -1 ? '1 day late' : `${-d} days late`
}

function BillForm({ initial, onSave, onCancel }: { initial?: Bill; onSave: (b: Bill) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [dueDay, setDueDay] = useState(String(initial?.dueDay ?? 15))
  const [category, setCategory] = useState<OutCat>(initial?.category ?? 'bills')
  const [account, setAccount] = useState<AccountId>(initial?.account ?? 'ewallet')
  const [error, setError] = useState('')
  const field = 'mt-1 h-11 w-full rounded-xl border border-line bg-wash px-3 outline-none focus:border-leaf focus:bg-white'

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault()
        const a = Number(amount.replace(/,/g, ''))
        const d = Number(dueDay)
        if (!name.trim()) return setError('Give the bill a name.')
        if (!(a > 0)) return setError('Enter the amount you usually pay.')
        if (!(d >= 1 && d <= 31)) return setError('The due day is a day of the month, 1 to 31.')
        onSave({ id: initial?.id ?? uid(), name: name.trim(), amount: a, dueDay: d, category, account })
      }}
    >
      <div className="mt-4 grid gap-3 rounded-2xl bg-wash/60 p-4 ring-1 ring-line sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm text-muted">Bill name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meralco, rent, Netflix…" className={field} autoFocus />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Amount</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="0.00" className={field} />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Due every month on day</span>
          <input value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className={field} />
        </label>
        <label className="block">
          <span className="text-sm text-muted">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as OutCat)} className={field}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">Paid with</span>
          <select value={account} onChange={(e) => setAccount(e.target.value as AccountId)} className={field}>
            {ACCOUNTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm font-medium text-critical sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-white">
            <Check className="size-4 text-lime" /> {initial ? 'Save bill' : 'Add bill'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2.5 font-medium text-ink-soft hover:bg-line">
            Cancel
          </button>
        </div>
      </div>
    </motion.form>
  )
}

export default function Bills({ month, bills, txs, onBills, onPay, onUnpay }: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const statuses = billStatuses(bills, txs, month)
  const total = statuses.reduce((s, b) => s + b.bill.amount, 0)
  const paid = statuses.filter((s) => s.state === 'paid').reduce((s, b) => s + (b.paidTx?.amount ?? b.bill.amount), 0)
  const overdue = statuses.filter((s) => s.state === 'overdue').length

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12 lg:gap-5">
      {/* Summary */}
      <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="rounded-[28px] bg-white/[0.06] p-6 ring-1 ring-white/10 backdrop-blur-md lg:col-span-4 lg:self-start">
        <p className="text-cream/70">Bills in {monthName(month)}</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-white">{money(total)}</p>
        <div className="mt-5 h-3 rounded-full bg-white/10" aria-hidden>
          <motion.div className="shimmer relative h-full overflow-hidden rounded-full bg-lime" initial={{ width: 0 }} animate={{ width: `${total ? (paid / total) * 100 : 0}%` }} transition={{ duration: 1.1, ease }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <p>
            <span className="block text-cream/55">Paid</span>
            <span className="text-lg font-bold text-lime">{money(paid)}</span>
          </p>
          <p>
            <span className="block text-cream/55">Left to pay</span>
            <span className="text-lg font-bold text-white">{money(total - paid)}</span>
          </p>
        </div>
        {overdue > 0 && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-critical/20 px-3 py-2 text-sm text-[#ffb4a8]">
            <AlarmClock className="size-4" aria-hidden /> {overdue} {overdue === 1 ? 'bill is' : 'bills are'} overdue
          </p>
        )}
      </motion.section>

      {/* Timeline */}
      <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease }} className="card p-5 sm:p-7 lg:col-span-8" aria-labelledby="bills-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="bills-title" className="flex items-center gap-2 font-semibold">
            <CalendarClock className="size-4.5 text-leaf" aria-hidden /> Due dates
          </h2>
          <button type="button" onClick={() => { setAdding((v) => !v); setEditingId(null) }} className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
            {adding ? <X className="size-4" /> : <Plus className="size-4" />} {adding ? 'Close' : 'Add bill'}
          </button>
        </div>

        <AnimatePresence>{adding && <BillForm key="new" onSave={(b) => { onBills([...bills, b]); setAdding(false) }} onCancel={() => setAdding(false)} />}</AnimatePresence>

        {statuses.length === 0 && !adding ? (
          <div className="py-12 text-center">
            <p className="text-lg font-semibold">No bills yet</p>
            <p className="mt-1 text-muted">Add the bills you pay every month and Pitaka will remind you when they’re due.</p>
          </div>
        ) : (
          <ol className="relative mt-5">
            {/* Vertical timeline rail */}
            <span className="absolute top-3 bottom-3 left-[1.6rem] w-px bg-line" aria-hidden />
            <AnimatePresence initial={false}>
              {statuses.map((s, i) => {
                const st = STATE[s.state]
                const StIcon = st.icon
                const c = CAT[s.bill.category]
                const A = ACC[s.bill.account]
                const day = fromISO(s.due)
                return (
                  <motion.li key={s.bill.id} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }} className="relative">
                    <div className="group flex items-center gap-4 rounded-2xl py-3 pr-2 transition-colors hover:bg-wash">
                      <span className={`relative z-10 grid size-13 shrink-0 place-items-center rounded-2xl text-center leading-none ${s.state === 'paid' ? 'bg-leaf text-white' : s.state === 'overdue' ? 'bg-critical text-white' : 'bg-white text-ink ring-1 ring-line'}`}>
                        <span>
                          <span className="block text-[10px] font-semibold uppercase opacity-75">{day.toLocaleDateString('en-US', { month: 'short' })}</span>
                          <span className="block text-lg font-extrabold">{day.getDate()}</span>
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {s.bill.name}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                            <StIcon className="size-3.5" aria-hidden /> {s.state === 'paid' ? st.label : `${st.label}: ${when(s.due).toLowerCase()}`}
                          </span>
                        </p>
                        <p className="text-sm text-muted">
                          {c.label}, {A.label}
                          {s.paidTx && s.paidTx.date !== s.due && `, paid ${fromISO(s.paidTx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                      <span className="num text-right font-semibold">{money(s.paidTx?.amount ?? s.bill.amount)}</span>
                      {s.state === 'paid' ? (
                        <button type="button" onClick={() => s.paidTx && onUnpay(s.paidTx)} className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-line">
                          <Undo2 className="size-4" /> Undo
                        </button>
                      ) : (
                        <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => onPay(s)} className="flex items-center gap-1.5 rounded-full bg-lime px-3.5 py-2 text-sm font-bold text-note shadow-sm">
                          <Check className="size-4" /> Mark paid
                        </motion.button>
                      )}
                      <span className="flex gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button type="button" onClick={() => { setEditingId(s.bill.id); setAdding(false) }} aria-label={`Edit ${s.bill.name}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-line hover:text-ink">
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => window.confirm(`Delete the “${s.bill.name}” bill? Past payments stay in your entries.`) && onBills(bills.filter((b) => b.id !== s.bill.id))}
                          aria-label={`Delete ${s.bill.name}`}
                          className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#fde8e6] hover:text-critical"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </span>
                    </div>
                    <AnimatePresence>
                      {editingId === s.bill.id && (
                        <BillForm key="edit" initial={s.bill} onSave={(b) => { onBills(bills.map((x) => (x.id === b.id ? b : x))); setEditingId(null) }} onCancel={() => setEditingId(null)} />
                      )}
                    </AnimatePresence>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ol>
        )}
      </motion.section>
    </div>
  )
}
