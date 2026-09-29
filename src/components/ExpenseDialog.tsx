import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDownLeft, ArrowUpRight, Calculator as CalcIcon, Check, PiggyBank, Plus, Trash2, X } from 'lucide-react'
import Calculator from './Calculator'
import { evaluate, isExpression } from '../lib/calc'
import {
  ACCOUNTS,
  CATEGORY_NAME_MAX,
  MAX_AMOUNT,
  CAT,
  CUSTOM_COLOR,
  CUSTOM_ICONS,
  catsFor,
  defaultNeed,
  money,
  todayISO,
  uid,
  type AccountId,
  type CatId,
  type CustomCategory,
  type CustomIcon,
  type Goal,
  type Need,
  type Tx,
  type TxType,
} from '../lib/data'

type Props = {
  open: boolean
  editing: Tx | null
  defaultDate: string
  defaultAmount?: number
  defaultType?: TxType
  defaultGoalId?: string
  goals: Goal[]
  onCreateGoal: (name: string, target: number) => Goal
  onCreateCategory: (c: Omit<CustomCategory, 'id'>) => CustomCategory
  onRemoveCategory: (id: CatId) => void
  onManageCategories: () => void
  categoryUse: (id: CatId) => number
  onClose: () => void
  onSave: (t: Tx) => void
}

const field = 'h-11 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-leaf'

/* Inline form for a category of your own */
function NewCategory({ type, onCreate, onCancel }: { type: 'out' | 'in'; onCreate: (c: Omit<CustomCategory, 'id'>) => void; onCancel: () => void }) {
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState<CustomIcon>('tag')
  const [need, setNeed] = useState<Need>('need')
  const [error, setError] = useState('')
  const create = () => {
    const name = label.trim()
    if (!name) return setError('Give the category a name.')
    if (name.length > CATEGORY_NAME_MAX) return setError(`Keep the name to ${CATEGORY_NAME_MAX} characters or fewer.`)
    if (catsFor(type).some((c) => c.label.toLowerCase() === name.toLowerCase())) return setError(`You already have a “${name}” category.`)
    onCreate({ label: name, type, icon, need: type === 'out' ? need : undefined })
  }
  return (
    <div className="mt-3 rounded-2xl bg-wash p-4">
      <p className="text-sm font-semibold">New {type === 'out' ? 'spending' : 'income'} category</p>
      <input
        autoFocus
        value={label}
        onChange={(e) => {
          setLabel(e.target.value)
          setError('')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            create()
          }
        }}
        maxLength={CATEGORY_NAME_MAX}
        placeholder={type === 'out' ? 'Pets, School, Load…' : 'Rental, Allowance…'}
        aria-label="Category name"
        aria-describedby="cat-name-count"
        className={`${field} mt-2`}
      />
      <p id="cat-name-count" className={`mt-1 text-right text-xs ${label.length >= CATEGORY_NAME_MAX ? 'font-semibold text-[#8a5d00]' : 'text-muted'}`}>
        {label.length}/{CATEGORY_NAME_MAX} characters
      </p>
      <p className="mt-3 text-xs text-muted">Icon</p>
      <div role="radiogroup" aria-label="Icon" className="mt-1 grid grid-cols-6 gap-1.5">
        {(Object.keys(CUSTOM_ICONS) as CustomIcon[]).map((k) => {
          const Icon = CUSTOM_ICONS[k]
          const on = icon === k
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={k}
              onClick={() => setIcon(k)}
              className={`grid h-10 place-items-center rounded-xl transition-colors ${on ? 'bg-ink text-lime' : 'bg-white text-ink-soft hover:bg-line'}`}
            >
              <Icon className="size-4.5" aria-hidden />
            </button>
          )
        })}
      </div>
      {type === 'out' && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Usually a</span>
          <div role="radiogroup" aria-label="Usually a need or want" className="flex rounded-full bg-white p-1">
            {(['need', 'want'] as const).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={need === n} onClick={() => setNeed(n)} className={`rounded-full px-3.5 py-1 text-sm font-semibold capitalize transition-colors ${need === n ? 'bg-ink text-white' : 'text-ink-soft'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-medium text-critical">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={create} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-note-soft">
          <Plus className="size-4 text-lime" aria-hidden /> Add category
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-sm font-semibold text-ink-soft hover:bg-line">
          Cancel
        </button>
      </div>
    </div>
  )
}

/* Inline form for a new savings goal */
function NewGoal({ onCreate, onCancel, first }: { onCreate: (name: string, target: number) => void; onCancel?: () => void; first: boolean }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const create = () => {
    const t = evaluate(target)
    if (!name.trim()) return setError('Give the goal a name.')
    if (t === null || t <= 0) return setError('Enter how much you want to save, more than ₱0.')
    onCreate(name.trim(), t)
  }
  const onEnter = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      create()
    }
  }
  return (
    <div className="mt-2 rounded-2xl bg-wash p-4">
      <p className="text-sm font-semibold">{first ? 'Create your first savings goal' : 'New savings goal'}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_9rem]">
        <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError('') }} onKeyDown={onEnter} maxLength={30} placeholder="Emergency fund, New phone…" aria-label="Goal name" className={field} />
        <span className="relative block">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">₱</span>
          <input value={target} onChange={(e) => { setTarget(e.target.value.replace(/[^\d.,+\-*/x×÷%()−\s]/g, '')); setError('') }} onKeyDown={onEnter} inputMode="decimal" placeholder="Target" aria-label="Target amount" className={`${field} num pl-7`} />
        </span>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-critical">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={create} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink text-sm font-semibold text-white hover:bg-note-soft">
          <Plus className="size-4 text-lime" aria-hidden /> Create goal
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-10 rounded-xl px-4 text-sm font-semibold text-ink-soft hover:bg-line">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

const TYPES: { id: TxType; label: string; icon: typeof ArrowUpRight; bg: string }[] = [
  { id: 'out', label: 'Money out', icon: ArrowUpRight, bg: 'bg-ink' },
  { id: 'in', label: 'Money in', icon: ArrowDownLeft, bg: 'bg-leaf' },
  { id: 'save', label: 'To savings', icon: PiggyBank, bg: 'bg-note-soft' },
]

export default function ExpenseDialog({ open, editing, defaultDate, defaultAmount, defaultType, defaultGoalId, goals, onCreateGoal, onCreateCategory, onRemoveCategory, onManageCategories, categoryUse, onClose, onSave }: Props) {
  const [making, setMaking] = useState<'category' | 'goal' | null>(null)
  const [type, setType] = useState<TxType>('out')
  const [need, setNeed] = useState<Need>('need')
  const [goalId, setGoalId] = useState<string | undefined>(undefined)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CatId>('food')
  const [account, setAccount] = useState<AccountId>('cash')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [error, setError] = useState('')
  const [calcOpen, setCalcOpen] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const t = editing?.type ?? defaultType ?? 'out'
    setType(t)
    setAmount(editing ? String(editing.amount) : defaultAmount ? String(defaultAmount) : '')
    setCategory(editing?.category ?? catsFor(t)[0].id)
    setNeed(editing?.need ?? defaultNeed(editing?.category ?? 'food'))
    setGoalId(editing?.goalId ?? defaultGoalId ?? goals[0]?.id)
    setAccount(editing?.account ?? 'cash')
    setNote(editing?.note ?? '')
    setDate(editing?.date ?? defaultDate)
    setError('')
    setCalcOpen(false)
    setMaking(null)
    setTimeout(() => amountRef.current?.focus(), 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultDate, defaultAmount, defaultType, defaultGoalId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const switchType = (t: TxType) => {
    setType(t)
    setMaking(null)
    setCategory(catsFor(t)[0].id)
    if (t === 'out') setNeed(defaultNeed(catsFor(t)[0].id))
    if (t !== 'out' && account === 'card') setAccount('bank')
  }

  const pickCategory = (c: CatId) => {
    setCategory(c)
    if (type === 'out') setNeed(defaultNeed(c))
  }

  const computed = evaluate(amount)
  const showPreview = isExpression(amount)

  const submit = () => {
    const n = computed
    if (n === null || n <= 0) {
      setError(amount.trim() ? 'That amount doesn’t add up. Check the math or clear it.' : 'Enter an amount greater than ₱0.')
      amountRef.current?.focus()
      return
    }
    if (n > MAX_AMOUNT) {
      setError(`That’s more than ${money(MAX_AMOUNT)} for one entry. Check the amount, or split it into smaller entries.`)
      amountRef.current?.focus()
      return
    }
    if (type === 'save' && !goalId) {
      setError('Choose a savings goal, or create one below.')
      return
    }
    onSave({
      ...(editing ?? {}),
      id: editing?.id ?? uid(),
      type,
      amount: n,
      category: type === 'save' ? 'savings' : category,
      account,
      note: note.trim() || (type === 'save' ? goals.find((g) => g.id === goalId)?.name ?? '' : ''),
      date,
      createdAt: editing?.createdAt ?? Date.now(),
      need: type === 'out' ? need : undefined,
      goalId: type === 'save' ? goalId : undefined,
    })
  }

  const cats = catsFor(type)
  const isIn = type === 'in'
  const isSave = type === 'save'
  const chosen = CAT[category]
  const chosenUse = chosen?.custom ? categoryUse(category) : 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-note-deep/60 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="card my-auto w-full max-w-lg rounded-b-none p-6 sm:rounded-b-[28px] sm:p-7"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="dialog-title" className="text-lg font-bold">
                {editing ? 'Edit entry' : isIn ? 'Add money in' : isSave ? 'Move to savings' : 'Add expense'}
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-wash hover:text-ink">
                <X className="size-5" />
              </button>
            </div>

            {/* Money out / Money in */}
            <div role="radiogroup" aria-label="Type" className="relative mt-4 grid grid-cols-3 rounded-2xl bg-wash p-1">
              {TYPES.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={type === t.id}
                    onClick={() => switchType(t.id)}
                    className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${type === t.id ? 'text-white' : 'text-ink-soft hover:text-ink'}`}
                  >
                    {type === t.id && <motion.span layoutId="type-pill" className={`absolute inset-0 -z-10 rounded-xl ${t.bg}`} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                    <Icon className="size-4" aria-hidden />
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Amount: accepts math like 120+45*2 */}
            <label className="mt-5 block">
              <span className="flex items-center justify-between text-sm text-muted">
                Amount
                <span className="text-xs">You can type math, like 120+45×2</span>
              </span>
              <span className={`mt-1 flex items-center gap-1 border-b-2 pb-2 transition-colors ${error ? 'border-critical' : 'border-line focus-within:border-leaf'}`}>
                <span className={`text-4xl font-bold ${isIn ? 'text-leaf' : 'text-muted'}`}>{isIn ? '+₱' : '₱'}</span>
                <input
                  ref={amountRef}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.replace(/[^\d.,+\-*/x×÷%()−\s]/g, ''))
                    setError('')
                  }}
                  onBlur={() => showPreview && computed !== null && setAmount(String(computed))}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'amount-error' : undefined}
                  className="num min-w-0 flex-1 bg-transparent text-5xl font-extrabold tracking-tight text-ink outline-none placeholder:text-line"
                />
                <motion.button
                  type="button"
                  onClick={() => setCalcOpen((v) => !v)}
                  aria-expanded={calcOpen}
                  aria-label={calcOpen ? 'Hide calculator' : 'Show calculator'}
                  whileTap={{ scale: 0.9 }}
                  className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors ${calcOpen ? 'bg-ink text-lime' : 'bg-wash text-ink-soft hover:bg-line'}`}
                >
                  <CalcIcon className="size-5" />
                </motion.button>
              </span>
            </label>
            <AnimatePresence initial={false}>
              {showPreview && computed !== null && !error && (
                <motion.p key="preview" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-sm font-semibold text-leaf">
                  = {money(computed)}
                </motion.p>
              )}
              {error && (
                <motion.p key="err" id="amount-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-sm font-medium text-critical">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {calcOpen && (
                <motion.div key="calc" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <div className="pt-4">
                    <Calculator
                      initial={amount}
                      keyboard={false}
                      onUse={(v) => {
                        setAmount(String(v))
                        setCalcOpen(false)
                        setError('')
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isSave ? (
              <fieldset className="mt-6">
                <legend className="text-sm text-muted">Savings goal</legend>
                {goals.length === 0 || making === 'goal' ? (
                  <NewGoal
                    first={goals.length === 0}
                    onCancel={goals.length ? () => setMaking(null) : undefined}
                    onCreate={(name, target) => {
                      const g = onCreateGoal(name, target)
                      setGoalId(g.id)
                      setMaking(null)
                      setError('')
                    }}
                  />
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {goals.map((g) => {
                      const on = goalId === g.id
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGoalId(g.id)}
                          aria-pressed={on}
                          className={`relative flex items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${on ? 'text-white' : 'bg-wash text-ink-soft hover:bg-line'}`}
                        >
                          {on && <motion.span layoutId="goal-pill" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                          <span className="relative size-3 shrink-0 rounded-full" style={{ background: g.color }} aria-hidden />
                          <span className="relative truncate">{g.name}</span>
                        </button>
                      )
                    })}
                    <button type="button" onClick={() => setMaking('goal')} className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-line px-3 py-2.5 text-left text-sm font-semibold text-ink-soft transition-colors hover:border-leaf hover:text-leaf">
                      <Plus className="size-4" aria-hidden /> New goal
                    </button>
                  </div>
                )}
              </fieldset>
            ) : (
            <fieldset className="mt-6">
              <legend className="text-sm text-muted">Category</legend>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={type}
                  initial={{ opacity: 0, x: isIn ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isIn ? -20 : 20 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 grid grid-cols-4 gap-2"
                >
                  {cats.map((c) => {
                    const Icon = c.icon
                    const on = category === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCategory(c.id)}
                        aria-pressed={on}
                        className={`relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center text-xs leading-tight font-medium transition-all ${on ? 'bg-ink text-white' : 'bg-wash text-ink-soft hover:bg-line'}`}
                      >
                        <motion.span animate={{ scale: on ? 1.1 : 1, rotate: on ? -6 : 0 }} className="grid size-9 place-items-center rounded-xl text-white" style={{ background: c.color }}>
                          <Icon className="size-4.5" aria-hidden />
                        </motion.span>
                        <span className="w-full truncate px-0.5">{c.label}</span>
                        {on && (
                          <motion.span layoutId="cat-check" className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-lime text-ink">
                            <Check className="size-3" strokeWidth={3} />
                          </motion.span>
                        )}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setMaking(making === 'category' ? null : 'category')}
                    aria-expanded={making === 'category'}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-1 py-2.5 text-center text-xs leading-tight font-semibold transition-colors ${making === 'category' ? 'border-leaf text-leaf' : 'border-line text-ink-soft hover:border-leaf hover:text-leaf'}`}
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-wash">
                      <Plus className={`size-4.5 transition-transform duration-300 ${making === 'category' ? 'rotate-45' : ''}`} aria-hidden />
                    </span>
                    New category
                  </button>
                </motion.div>
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {making === 'category' && (
                  <motion.div key="new-cat" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <NewCategory
                      type={isIn ? 'in' : 'out'}
                      onCancel={() => setMaking(null)}
                      onCreate={(c) => {
                        const made = onCreateCategory(c)
                        setMaking(null)
                        pickCategory(made.id)
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Your own categories can be removed while nothing uses them */}
              {chosen?.custom && making !== 'category' && (
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span className="inline-block size-2.5 rounded-full" style={{ background: CUSTOM_COLOR }} aria-hidden />
                  “{chosen.label}” is a category you added.
                  {chosenUse === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveCategory(category)
                        pickCategory(catsFor(type)[0].id)
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-critical hover:underline"
                    >
                      <Trash2 className="size-3" aria-hidden /> Remove it
                    </button>
                  )}
                  <button type="button" onClick={onManageCategories} className="font-semibold text-leaf hover:underline">
                    Rename or manage categories
                  </button>
                </p>
              )}

              {/* Need or want: defaults from the category, can be changed per entry */}
              {type === 'out' && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-muted">This was a</span>
                  <div role="radiogroup" aria-label="Need or want" className="relative flex rounded-full bg-wash p-1">
                    {(['need', 'want'] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={need === n}
                        onClick={() => setNeed(n)}
                        className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${need === n ? 'text-white' : 'text-ink-soft'}`}
                      >
                        {need === n && <motion.span layoutId="need-pill" className="absolute inset-0 -z-10 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>
            )}

            {/* Where the money came from or went through */}
            <fieldset className="mt-5">
              <legend className="text-sm text-muted">{isIn ? 'Received in' : isSave ? 'Moved from' : 'Paid with'}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ACCOUNTS.map((a) => {
                  const Icon = a.icon
                  const on = account === a.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccount(a.id)}
                      aria-pressed={on}
                      className={`relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${on ? 'text-white' : 'bg-wash text-ink-soft hover:bg-line'}`}
                    >
                      {on && <motion.span layoutId="acc-pill" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                      <Icon className="relative size-4" aria-hidden />
                      <span className="relative">{a.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_11rem]">
              <label className="block">
                <span className="text-sm text-muted">Note</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isIn ? 'Where did it come from?' : 'What was it for?'}
                  maxLength={60}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-wash px-3 outline-none focus:border-leaf focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Date</span>
                <input
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value || defaultDate)}
                  className="mt-1 h-11 w-full rounded-xl border border-line bg-wash px-3 outline-none focus:border-leaf focus:bg-white"
                />
              </label>
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className={`mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-2xl font-bold text-white transition-colors ${isIn ? 'bg-leaf hover:bg-note-soft' : 'bg-ink hover:bg-note-soft'}`}
            >
              <Check className="size-5 text-lime" aria-hidden />
              {editing ? 'Save changes' : isIn ? 'Add money in' : isSave ? 'Move to savings' : 'Add expense'}
            </motion.button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
