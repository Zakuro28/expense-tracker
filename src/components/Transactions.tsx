import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ListFilter, Pencil, Plus, Receipt, Search, Trash2, X } from 'lucide-react'
import { ACC, ACCOUNTS, CAT, CATEGORIES, INCOME_CATEGORIES, dayHeading, money, type AccountId, type CatId, type Goal, type Tx, type TxType } from '../lib/data'

type Props = {
  txs: Tx[] // entries in the period on screen
  goals: Goal[]
  query: string
  onQuery: (q: string) => void
  typeFilter: TxType | null
  onType: (t: TxType | null) => void
  category: CatId | null
  onCategory: (c: CatId | null) => void
  account: AccountId | null
  onAccount: (a: AccountId | null) => void
  onEdit: (t: Tx) => void
  onDelete: (t: Tx) => void
  onAdd: () => void
  highlightId: string | null
}

const TYPE_FILTERS: { id: TxType | null; label: string }[] = [
  { id: null, label: 'All' },
  { id: 'out', label: 'Money out' },
  { id: 'in', label: 'Money in' },
  { id: 'save', label: 'Savings' },
]

export default function Transactions(p: Props) {
  const { txs, goals, query, onQuery, typeFilter, onType, category, onCategory, account, onAccount, onEdit, onDelete, onAdd, highlightId } = p

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return txs
      .filter((t) => (!typeFilter || t.type === typeFilter) && (!category || t.category === category) && (!account || t.account === account))
      .filter((t) => !q || t.note.toLowerCase().includes(q) || CAT[t.category]?.label.toLowerCase().includes(q) || String(t.amount).includes(q) || ACC[t.account].label.toLowerCase().includes(q))
      .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
  }, [txs, query, typeFilter, category, account])

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>()
    for (const t of filtered) map.set(t.date, [...(map.get(t.date) ?? []), t])
    return [...map.entries()]
  }, [filtered])

  // Show the latest week first; more on request. Reset when the filters change.
  const [limit, setLimit] = useState(7)
  useEffect(() => setLimit(7), [query, typeFilter, category, account, txs])
  const visible = groups.slice(0, limit)

  const filtering = Boolean(query || typeFilter || category || account)
  const clearAll = () => {
    onQuery('')
    onType(null)
    onCategory(null)
    onAccount(null)
  }
  const chipCats = typeFilter === 'in' ? INCOME_CATEGORIES : typeFilter === 'out' ? CATEGORIES : [...CATEGORIES, ...INCOME_CATEGORIES]

  return (
    <section aria-labelledby="tx-title" className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tx-title" className="flex items-center gap-2 font-semibold">
          <ListFilter className="size-4.5 text-leaf" aria-hidden /> Entries
          <span className="num ml-1 text-sm font-normal text-muted">{filtered.length} shown</span>
        </h2>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search notes, categories, accounts"
            aria-label="Search entries"
            className="h-11 w-full rounded-full border border-line bg-wash pr-10 pl-10 text-ink outline-none transition-colors placeholder:text-muted focus:border-leaf focus:bg-white"
          />
          {query && (
            <button type="button" onClick={() => onQuery('')} aria-label="Clear search" className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-line">
              <X className="size-4" />
            </button>
          )}
        </label>
      </div>

      {/* Type and account filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex rounded-full bg-wash p-1" role="group" aria-label="Filter by type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={typeFilter === f.id}
              onClick={() => {
                onType(f.id)
                onCategory(null)
              }}
              className={`relative z-10 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${typeFilter === f.id ? 'text-white' : 'text-ink-soft hover:text-ink'}`}
            >
              {typeFilter === f.id && <motion.span layoutId="type-filter" className="absolute inset-0 -z-10 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 450, damping: 35 }} />}
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by account">
          {ACCOUNTS.map((a) => {
            const Icon = a.icon
            const on = account === a.id
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => onAccount(on ? null : a.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line text-ink-soft hover:bg-wash'}`}
              >
                <Icon className="size-3.5" aria-hidden /> {a.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Category chips */}
      {typeFilter !== 'save' && (
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-7 sm:px-7" role="group" aria-label="Filter by category">
          <Chip on={!category} onClick={() => onCategory(null)}>
            All categories
          </Chip>
          {chipCats.map((c) => {
            const Icon = c.icon
            return (
              <Chip key={c.id} on={category === c.id} onClick={() => onCategory(category === c.id ? null : c.id)}>
                <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
                <Icon className="size-3.5" aria-hidden />
                {c.label}
              </Chip>
            )
          })}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-lg font-semibold">{filtering ? 'Nothing matches' : 'No entries yet'}</p>
          <p className="mt-1 text-muted">{filtering ? 'Try another search or clear the filters.' : 'Add money in or out and it will show up here.'}</p>
          <button type="button" onClick={filtering ? clearAll : onAdd} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-white">
            {filtering ? <X className="size-4" /> : <Plus className="size-4" />}
            {filtering ? 'Clear filters' : 'Add entry'}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <AnimatePresence initial={false}>
            {visible.map(([date, items]) => {
              const dayOut = items.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0)
              const dayIn = items.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0)
              return (
                <motion.div key={date} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-3">
                  <div className="flex items-baseline justify-between border-b border-line pb-2 text-sm">
                    <h3 className="font-semibold text-ink-soft">{dayHeading(date)}</h3>
                    <span className="num text-muted">
                      {dayIn > 0 && <span className="mr-3 text-leaf">+{money(dayIn)}</span>}
                      {dayOut > 0 && `−${money(dayOut)}`}
                    </span>
                  </div>
                  <ul>
                    <AnimatePresence initial={false}>
                      {items.map((t) => (
                        <Row key={t.id} t={t} goals={goals} highlight={highlightId === t.id} onEdit={onEdit} onDelete={onDelete} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {groups.length > limit && (
            <motion.button
              type="button"
              layout
              onClick={() => setLimit((l) => l + 7)}
              whileTap={{ scale: 0.98 }}
              className="mt-4 w-full rounded-2xl border border-dashed border-line py-3 font-semibold text-ink-soft transition-colors hover:border-leaf hover:bg-wash hover:text-ink"
            >
              Show earlier days
              <span className="ml-1.5 font-normal text-muted">({groups.length - limit} more)</span>
            </motion.button>
          )}
        </div>
      )}
    </section>
  )
}

function Row({ t, goals, highlight, onEdit, onDelete }: { t: Tx; goals: Goal[]; highlight: boolean; onEdit: (t: Tx) => void; onDelete: (t: Tx) => void }) {
  const c = CAT[t.category] ?? CAT.other
  const Icon = c.icon
  const A = ACC[t.account]
  const AccIcon = A.icon
  const goal = t.type === 'save' ? goals.find((g) => g.id === t.goalId) : undefined
  const title = t.note || goal?.name || c.label
  const withdrawal = t.type === 'save' && t.amount < 0 // money taken back out of a goal
  const sign = t.type === 'in' || withdrawal ? '+' : '−'

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0, y: -8 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, x: 80, backgroundColor: 'rgba(208,59,59,0.12)' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl"
    >
      <div className={`group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-wash ${highlight ? 'just-added' : ''}`}>
        <span
          className="grid size-10 shrink-0 place-items-center rounded-2xl text-white transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: goal?.color ?? c.color }}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        <button type="button" onClick={() => onEdit(t)} className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{title}</span>
            {t.billId && <Receipt className="size-3.5 shrink-0 text-muted" aria-label="Bill" />}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
            {withdrawal ? `From ${goal?.name ?? 'savings'}` : t.type === 'save' ? `Savings${goal ? `: ${goal.name}` : ''}` : c.label}
            <span className="inline-flex items-center gap-1">
              <AccIcon className="size-3.5" aria-hidden />
              {A.label}
            </span>
            {t.type === 'out' && t.need && (
              <span className={`rounded-full px-1.5 text-[11px] font-semibold ${t.need === 'need' ? 'bg-ink/8 text-ink-soft' : 'bg-gold/20 text-[#8a5d00]'}`}>{t.need === 'need' ? 'Need' : 'Want'}</span>
            )}
          </span>
        </button>
        <span className={`num font-semibold ${t.type === 'in' ? 'text-leaf' : t.type === 'save' ? 'text-ink-soft' : ''}`}>
          {sign}
          {money(Math.abs(t.amount))}
        </span>
        <span className="flex gap-1 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button type="button" onClick={() => onEdit(t)} aria-label={`Edit ${title}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-line hover:text-ink">
            <Pencil className="size-4" />
          </button>
          <button type="button" onClick={() => onDelete(t)} aria-label={`Delete ${title}`} className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#fde8e6] hover:text-critical">
            <Trash2 className="size-4" />
          </button>
        </span>
      </div>
    </motion.li>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${on ? 'text-white' : 'bg-wash text-ink-soft hover:bg-line'}`}
    >
      {on && <motion.span layoutId="chip-bg" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 450, damping: 35 }} />}
      <span className="relative flex items-center gap-1.5">{children}</span>
    </button>
  )
}
