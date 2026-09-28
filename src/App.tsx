import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, Plus, Receipt, Target, X } from 'lucide-react'
import Guilloche from './components/Guilloche'
import AuthScreen from './components/AuthScreen'
import BudgetHero from './components/BudgetHero'
import Accounts from './components/Accounts'
import PeriodChart from './components/PeriodChart'
import Categories from './components/Categories'
import Transactions from './components/Transactions'
import BudgetPlan from './components/BudgetPlan'
import Bills from './components/Bills'
import Goals from './components/Goals'
import ExpenseDialog from './components/ExpenseDialog'
import ImportDialog from './components/ImportDialog'
import SampleNotice from './components/SampleNotice'
import Calculator from './components/Calculator'
import CoinFlight, { type Flight } from './components/CoinFlight'
import Toast, { type ToastMsg } from './components/Toast'
import { BookSwitcher, ToolsMenu, UserMenu } from './components/Menus'
import { GUEST_ID, currentUser, deleteAccount, enterGuest, guestHasData, moveGuestDataTo, signOut, type PublicUser } from './lib/auth'
// The Excel library is large, so it loads only when someone exports
const exportToExcel = async (...args: Parameters<typeof import('./lib/excel').exportToExcel>) => (await import('./lib/excel')).exportToExcel(...args)
import {
  billsKey,
  bookKey,
  daysInMonth,
  defaultNeed,
  GOAL_COLORS,
  goalSaved,
  goalsKey,
  markOldSample,
  newCategoryId,
  sampleNoticeKey,
  setCustomCategories,
  withoutSample,
  type CustomCategory,
  type SampleNotice as NoticeState,
  inRange,
  load,
  loadBooks,
  loadTx,
  monthKey,
  newBook,
  nsKey,
  periodLabel,
  periodPhrase,
  rangeOf,
  sampleData,
  save,
  setStorageUser,
  shiftAnchor,
  todayISO,
  uid,
  wishKey,
  type AccountId,
  type Bill,
  type BillStatus,
  type Book,
  type CatId,
  type Goal,
  type Period,
  type Tx,
  type TxType,
  type Wish,
} from './lib/data'

const ease = [0.16, 1, 0.3, 1] as const

// The wallet pops up, its strap slides shut, the clasp clicks, then the name types in
function Logo() {
  const spring = { type: 'spring' as const, stiffness: 320, damping: 16 }
  return (
    <span className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-white">
      <motion.svg viewBox="0 0 64 64" className="size-9" aria-hidden whileHover={{ rotate: -8, scale: 1.08 }}>
        <motion.rect width="64" height="64" rx="18" fill="#155240" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} style={{ transformOrigin: '32px 32px' }} />
        <motion.rect x="12" y="20" width="40" height="28" rx="7" fill="#c9f26b" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...spring, delay: 0.15 }} style={{ transformOrigin: '32px 48px' }} />
        <motion.path d="M12 27h40" stroke="#0c3a2b" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.35 }} />
        <motion.g initial={{ x: 18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...spring, delay: 0.5 }}>
          <rect x="36" y="32" width="16" height="10" rx="5" fill="#0c3a2b" />
          <circle cx="42" cy="37" r="2.2" fill="#c9f26b" />
        </motion.g>
      </motion.svg>
      <span className="hidden overflow-hidden sm:flex">
        {'Pitaka'.split('').map((ch, i) => (
          <motion.span key={i} initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ delay: 0.45 + i * 0.04, duration: 0.5, ease }}>
            {ch}
          </motion.span>
        ))}
      </span>
    </span>
  )
}

// Cards tilt up into place as they scroll into view
const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 50, rotateX: 10 },
  whileInView: { opacity: 1, y: 0, rotateX: 0 },
  viewport: { once: true, margin: '0px 0px -8% 0px' },
  transition: { duration: 0.8, delay, ease },
})

type Tab = 'overview' | 'plan' | 'bills' | 'goals'
const TABS: { id: Tab; label: string; icon: typeof Target }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'plan', label: 'Budget plan', icon: ClipboardList },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'goals', label: 'Goals & wishlist', icon: Target },
]
const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]

/* ---------- Sign-in gate ---------- */

export default function App() {
  // No account needed: without one, everything saves to this device's guest space
  const [user, setUser] = useState<PublicUser | null>(() => {
    const u = currentUser()
    if (u) setStorageUser(u.id)
    else enterGuest()
    return u
  })
  const [authMode, setAuthMode] = useState<'in' | 'up' | null>(null)
  const toGuest = () => {
    enterGuest()
    setUser(null)
  }

  return (
    <MotionConfig reducedMotion="user">
      <Guilloche />
      <AnimatePresence mode="wait">
        {authMode ? (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
            <AuthScreen
              initialMode={authMode}
              canBringGuestData={!user && guestHasData()}
              onBack={() => setAuthMode(null)}
              onAuthed={(u, opts) => {
                if (opts.bringGuestData) moveGuestDataTo(u.id)
                setStorageUser(u.id)
                if (opts.isNew && !opts.bringGuestData) loadBooks({ withSample: opts.withSample })
                setUser(u)
                setAuthMode(null)
              }}
            />
          </motion.div>
        ) : (
          <motion.div key={user?.id ?? GUEST_ID} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35 }}>
            <Tracker
              user={user}
              onSignIn={setAuthMode}
              onLogout={() => {
                signOut()
                toGuest()
              }}
              onDeleteAccount={() => {
                if (user) deleteAccount(user.id)
                toGuest()
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}

/* ---------- The tracker, for a guest or a signed-in person ---------- */

function Tracker({ user, onSignIn, onLogout, onDeleteAccount }: { user: PublicUser | null; onSignIn: (mode: 'in' | 'up') => void; onLogout: () => void; onDeleteAccount: () => void }) {
  // Always read and write inside this person's storage space
  setStorageUser(user?.id ?? GUEST_ID)
  const initial = useMemo(() => loadBooks(), [])
  const [books, setBooks] = useState<Book[]>(initial.books)
  const [activeId, setActiveId] = useState(initial.activeId)
  const book = books.find((b) => b.id === activeId) ?? books[0]

  const [start] = useState(() => {
    const d = { txs: loadTx(book.id), bills: load<Bill[]>(billsKey(book.id), []), goals: load<Goal[]>(goalsKey(book.id), []), wishes: load<Wish[]>(wishKey(book.id), []) }
    const saved = load<NoticeState | null>(sampleNoticeKey(), null)
    if (saved) return { ...d, notice: saved }
    // Sample data saved before it was marked as such gets marked now
    const marked = markOldSample(d)
    return marked ? { ...marked, notice: 'intro' as const } : { ...d, notice: 'off' as const }
  })
  const [txs, setTxs] = useState<Tx[]>(start.txs)
  const [bills, setBills] = useState<Bill[]>(start.bills)
  const [goals, setGoals] = useState<Goal[]>(start.goals)
  const [wishes, setWishes] = useState<Wish[]>(start.wishes)
  const loadedFor = useRef(book.id)

  // "This is example data" message: shown once on first open, then as a small reminder
  const [notice, setNotice] = useState<NoticeState>(start.notice)
  useEffect(() => save(sampleNoticeKey(), notice), [notice])

  // This person's own categories, shared by all their books
  const [customCats, setCustomCats] = useState<CustomCategory[]>(() => load(nsKey('categories'), []))
  setCustomCategories(customCats)
  useEffect(() => save(nsKey('categories'), customCats), [customCats])

  // Switching books loads that book's data; everything saves automatically as it changes
  useEffect(() => {
    if (loadedFor.current === book.id) return
    loadedFor.current = book.id
    setTxs(loadTx(book.id))
    setBills(load(billsKey(book.id), []))
    setGoals(load(goalsKey(book.id), []))
    setWishes(load(wishKey(book.id), []))
  }, [book.id])
  useEffect(() => {
    if (loadedFor.current === book.id) save(bookKey(book.id), txs)
  }, [txs, book.id])
  useEffect(() => {
    if (loadedFor.current === book.id) save(billsKey(book.id), bills)
  }, [bills, book.id])
  useEffect(() => {
    if (loadedFor.current === book.id) save(goalsKey(book.id), goals)
  }, [goals, book.id])
  useEffect(() => {
    if (loadedFor.current === book.id) save(wishKey(book.id), wishes)
  }, [wishes, book.id])
  useEffect(() => save(nsKey('books'), books), [books])
  useEffect(() => save(nsKey('active'), activeId), [activeId])

  const patchBook = (patch: Partial<Book>) => setBooks((bs) => bs.map((b) => (b.id === book.id ? { ...b, ...patch } : b)))

  /* ---------- View state ---------- */
  const [tab, setTab] = useState<Tab>(() => load(nsKey('tab'), 'overview'))
  const [period, setPeriod] = useState<Period>(() => load(nsKey('period'), 'month'))
  const [anchor, setAnchor] = useState(todayISO())
  const [dir, setDir] = useState(0)
  useEffect(() => save(nsKey('tab'), tab), [tab])
  useEffect(() => save(nsKey('period'), period), [period])

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TxType | null>(null)
  const [category, setCategory] = useState<CatId | null>(null)
  const [account, setAccount] = useState<AccountId | null>(null)

  const [dialog, setDialog] = useState<{ editing: Tx | null; amount?: number; type?: TxType; goalId?: string } | null>(null)
  const [calcOpen, setCalcOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [toast, setToast] = useState<ToastMsg | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [flight, setFlight] = useState<Flight | null>(null)
  const pending = useRef<Tx | null>(null)
  const [pulse, setPulse] = useState(0)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()

  // Bills and budget plan always look at a whole month
  const viewPeriod: Period = tab === 'overview' ? period : 'month'
  const range = rangeOf(viewPeriod, anchor)
  const periodTx = useMemo(() => txs.filter((t) => inRange(t.date, range)), [txs, range.start, range.end]) // eslint-disable-line react-hooks/exhaustive-deps
  const out = periodTx.reduce((s, t) => (t.type === 'out' ? s + t.amount : s), 0)
  const inn = periodTx.reduce((s, t) => (t.type === 'in' ? s + t.amount : s), 0)
  const saved = periodTx.reduce((s, t) => (t.type === 'save' ? s + t.amount : s), 0)
  const isCurrent = inRange(todayISO(), range)

  const dim = daysInMonth(monthKey(anchor))
  const budget =
    period === 'week' ? book.weeklyBudget : period === 'month' ? book.monthlyBudget : period === 'day' ? book.monthlyBudget / dim : book.monthlyBudget * 12
  const budgetKind = period === 'week' ? 'weekly' : period === 'month' ? 'monthly' : 'derived'
  const budgetPerBucket = period === 'year' ? book.monthlyBudget : period === 'month' ? book.monthlyBudget / dim : book.weeklyBudget / 7

  const notify = useCallback((text: string, undo?: () => void) => {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, undo })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  const openAdd = useCallback((opts: { amount?: number; type?: TxType; goalId?: string } = {}) => setDialog({ editing: null, ...opts }), [])

  // Press N to add
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement
      if (!typing && !dialog && !calcOpen && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        openAdd()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, calcOpen, openAdd])

  const go = (by: number) => {
    setDir(by)
    setAnchor((a) => shiftAnchor(viewPeriod, a, by))
  }
  const choosePeriod = (p: Period) => {
    setDir(0)
    setPeriod(p)
  }
  const nextDisabled = rangeOf(viewPeriod, shiftAnchor(viewPeriod, anchor, 1)).start > todayISO()

  /* ---------- Entries ---------- */

  const landNew = useCallback(
    (t: Tx) => {
      setTxs((list) => [...list, t])
      setHighlightId(t.id)
      setPulse((p) => p + 1)
      notify(t.type === 'in' ? 'Money in added' : t.type === 'save' ? 'Moved to savings' : 'Expense added')
    },
    [notify],
  )

  const saveTx = (t: Tx) => {
    const isEdit = txs.some((x) => x.id === t.id)
    const inView = inRange(t.date, range) && tab === 'overview'
    const from = document.querySelector('[role=dialog] button[type=submit]')?.getBoundingClientRect()
    const to = document.getElementById('hero-total')?.getBoundingClientRect()
    setDialog(null)

    const visible = to && to.bottom > 40 && to.top < window.innerHeight - 40
    // New spending in view: fly a coin into the total, then add it
    if (!isEdit && t.type === 'out' && inView && from && to && visible && !reduceMotion) {
      pending.current = t
      setFlight({ id: Date.now(), amount: t.amount, from: { x: from.left + from.width / 2, y: from.top + from.height / 2 }, to: { x: to.left + Math.min(to.width, 420) * 0.6, y: to.top + to.height / 2 } })
      return
    }
    if (isEdit) {
      setTxs((list) => list.map((x) => (x.id === t.id ? t : x)))
      setHighlightId(t.id)
      notify('Changes saved')
    } else landNew(t)
  }

  const deleteTx = (t: Tx) => {
    setTxs((list) => list.filter((x) => x.id !== t.id))
    const wish = t.wishId ? wishes.find((w) => w.boughtTxId === t.id) : undefined
    if (wish) setWishes((ws) => ws.map((w) => (w.id === wish.id ? { ...w, boughtTxId: undefined } : w)))
    notify('Entry deleted', () => {
      setTxs((list) => [...list, t])
      if (wish) setWishes((ws) => ws.map((w) => (w.id === wish.id ? { ...w, boughtTxId: t.id } : w)))
    })
  }

  const payBill = (s: BillStatus) => {
    const today = todayISO()
    const t: Tx = {
      id: uid(),
      type: 'out',
      amount: s.bill.amount,
      category: s.bill.category,
      account: s.bill.account,
      note: s.bill.name,
      date: s.due <= today ? s.due : today,
      createdAt: Date.now(),
      need: defaultNeed(s.bill.category),
      billId: s.bill.id,
    }
    setTxs((list) => [...list, t])
    notify(`${s.bill.name} marked paid`, () => setTxs((list) => list.filter((x) => x.id !== t.id)))
  }

  const buyWish = (w: Wish) => {
    const today = todayISO()
    const buy: Tx = { id: uid(), type: 'out', amount: w.price, category: w.category, account: 'bank', note: w.name, date: today, createdAt: Date.now(), need: w.need, wishId: w.id }
    const added: Tx[] = [buy]
    // Paying from a linked goal takes that money back out of savings
    const goal = goals.find((g) => g.id === w.goalId)
    const available = goal ? goalSaved(goal.id, txs) : 0
    if (goal && available > 0) {
      added.push({ id: uid(), type: 'save', amount: -Math.min(available, w.price), category: 'savings', account: 'bank', note: `Used for ${w.name}`, date: today, createdAt: Date.now() - 1, goalId: goal.id })
    }
    setTxs((list) => [...list, ...added])
    setWishes((ws) => ws.map((x) => (x.id === w.id ? { ...x, boughtTxId: buy.id } : x)))
    notify(`${w.name} bought and added to spending`, () => {
      setTxs((list) => list.filter((x) => !added.some((a) => a.id === x.id)))
      setWishes((ws) => ws.map((x) => (x.id === w.id ? { ...x, boughtTxId: undefined } : x)))
    })
  }

  /* ---------- Example data ---------- */

  const deleteSample = () => {
    const before = { txs, bills, goals, wishes, notice }
    const clean = withoutSample({ txs, bills, goals, wishes })
    setTxs(clean.txs)
    setBills(clean.bills)
    setGoals(clean.goals)
    setWishes(clean.wishes)
    setNotice('off')
    // Sample data only ever goes into one book, but clear any others too
    for (const b of books) {
      if (b.id === book.id) continue
      const other = withoutSample({ txs: loadTx(b.id), bills: load(billsKey(b.id), []), goals: load(goalsKey(b.id), []), wishes: load(wishKey(b.id), []) })
      save(bookKey(b.id), other.txs)
      save(billsKey(b.id), other.bills)
      save(goalsKey(b.id), other.goals)
      save(wishKey(b.id), other.wishes)
    }
    setDir(0)
    setTab('overview')
    notify('Example data deleted. You’re starting fresh.', () => {
      setTxs(before.txs)
      setBills(before.bills)
      setGoals(before.goals)
      setWishes(before.wishes)
      setNotice(before.notice === 'intro' ? 'banner' : before.notice)
    })
  }

  const loadSample = () => {
    const s = sampleData()
    // Replaces earlier examples, keeps everything you added yourself
    setTxs((l) => [...l.filter((t) => !t.sample), ...s.txs])
    setBills((l) => [...l.filter((b) => !b.sample), ...s.bills])
    setGoals((l) => [...l.filter((g) => !g.sample), ...s.goals])
    setWishes((l) => [...l.filter((w) => !w.sample), ...s.wishes])
    setNotice('banner')
    notify('Example data added')
  }

  /* ---------- Your own categories and goals, created from the add form ---------- */

  const createCategory = (c: Omit<CustomCategory, 'id'>) => {
    const made: CustomCategory = { ...c, id: newCategoryId() }
    const next = [...customCats, made]
    setCustomCategories(next) // so the form can show it straight away
    setCustomCats(next)
    return made
  }
  const categoryUse = (id: CatId) =>
    txs.filter((t) => t.category === id).length +
    bills.filter((b) => b.category === id).length +
    wishes.filter((w) => w.category === id).length +
    books.filter((b) => b.id !== book.id).reduce((n, b) => n + loadTx(b.id).filter((t) => t.category === id).length, 0)
  const removeCategory = (id: CatId) => {
    const next = customCats.filter((c) => c.id !== id)
    setCustomCategories(next)
    setCustomCats(next)
  }

  const createGoal = (name: string, target: number) => {
    const g: Goal = { id: uid(), name, target, color: GOAL_COLORS[goals.length % GOAL_COLORS.length] }
    setGoals((gs) => [...gs, g])
    notify(`“${name}” goal created`)
    return g
  }

  /* ---------- Books ---------- */

  const createBook = (name: string) => {
    const b = newBook(name)
    save(bookKey(b.id), [])
    save(billsKey(b.id), [])
    save(goalsKey(b.id), [])
    save(wishKey(b.id), [])
    setBooks((bs) => [...bs, b])
    setActiveId(b.id)
    notify(`“${name}” book created`)
  }
  const deleteBook = (id: string) => {
    const rest = books.filter((b) => b.id !== id)
    ;[bookKey(id), billsKey(id), goalsKey(id), wishKey(id)].forEach((k) => {
      try {
        localStorage.removeItem(k)
      } catch {
        /* storage unavailable */
      }
    })
    setBooks(rest)
    setActiveId(rest[0].id)
  }

  const phrase = periodPhrase(viewPeriod, anchor)
  const label = periodLabel(viewPeriod, anchor)
  const viewKey = `${tab}-${viewPeriod}-${range.start}-${book.id}`

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 sm:pt-7">
        {/* Top bar */}
        <header className="flex items-center gap-2 sm:gap-3">
          <Logo />
          <BookSwitcher books={books} activeId={book.id} onSwitch={setActiveId} onCreate={createBook} onRename={(id, name) => setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, name } : b)))} onDelete={deleteBook} />
          <div className="ml-auto flex items-center gap-2">
            <ToolsMenu
              periodLabel={tab === 'overview' ? label : 'this view'}
              onCalculator={() => setCalcOpen(true)}
              onExportPeriod={() => {
                exportToExcel(periodTx, book.name, label)
                notify('Excel file downloaded')
              }}
              onExportAll={() => {
                exportToExcel(txs, book.name, 'all')
                notify('Excel file downloaded')
              }}
              onImport={() => setImportOpen(true)}
            />
            <motion.button
              type="button"
              onClick={() => openAdd()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.6 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="group hidden items-center gap-2 rounded-full bg-lime px-5 py-2.5 font-bold text-note shadow-[0_10px_30px_-10px_rgba(201,242,107,0.8)] sm:flex"
            >
              <Plus className="size-4.5 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.6} aria-hidden />
              Add
              <kbd className="ml-1 rounded-md bg-note/12 px-1.5 text-xs font-semibold">N</kbd>
            </motion.button>
            <UserMenu user={user} onSignIn={onSignIn} onLogout={onLogout} onDeleteAccount={onDeleteAccount} />
          </div>
        </header>

        {/* Tabs and period controls */}
        <nav className="mt-6 flex flex-wrap items-center justify-between gap-3" aria-label="Sections">
          <div className="no-scrollbar -mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex rounded-full bg-white/8 p-1 ring-1 ring-white/10 backdrop-blur" role="tablist">
              {TABS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative z-10 flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${tab === t.id ? 'text-note' : 'text-cream/75 hover:text-white'}`}
                  >
                    {tab === t.id && <motion.span layoutId="main-tab" className="absolute inset-0 -z-10 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <Icon className="size-4" aria-hidden />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {tab !== 'goals' && (
            <div className="flex flex-wrap items-center gap-2">
              {tab === 'overview' && (
                <div className="flex rounded-full bg-white/8 p-1 ring-1 ring-white/10" role="radiogroup" aria-label="Summary period">
                  {PERIODS.map((p) => (
                    <button
                      key={p.id}
                      role="radio"
                      aria-checked={period === p.id}
                      onClick={() => choosePeriod(p.id)}
                      className={`relative z-10 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${period === p.id ? 'text-note' : 'text-cream/75 hover:text-white'}`}
                    >
                      {period === p.id && <motion.span layoutId="period-pill" className="absolute inset-0 -z-10 rounded-full bg-white" transition={{ type: 'spring', stiffness: 450, damping: 34 }} />}
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center rounded-full bg-white/8 p-1 ring-1 ring-white/10">
                <button type="button" onClick={() => go(-1)} aria-label="Previous" className="grid size-9 place-items-center rounded-full text-cream/80 hover:bg-white/10 hover:text-white">
                  <ChevronLeft className="size-4.5" />
                </button>
                <div className="relative w-36 overflow-hidden text-center sm:w-44" aria-live="polite">
                  <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                    <motion.span key={label} initial={{ x: dir * 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -40, opacity: 0 }} transition={{ duration: 0.25 }} className="block text-sm font-semibold whitespace-nowrap text-white">
                      {label}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <button type="button" onClick={() => go(1)} disabled={nextDisabled} aria-label="Next" className="grid size-9 place-items-center rounded-full text-cream/80 hover:bg-white/10 hover:text-white disabled:opacity-30">
                  <ChevronRight className="size-4.5" />
                </button>
              </div>
              {!isCurrent && (
                <button type="button" onClick={() => { setDir(anchor < todayISO() ? 1 : -1); setAnchor(todayISO()) }} className="rounded-full px-3 py-2 text-sm font-semibold text-lime hover:bg-white/10">
                  Back to today
                </button>
              )}
            </div>
          )}
        </nav>

        <SampleNotice state={notice} onDelete={deleteSample} onKeep={() => setNotice('banner')} onHide={() => setNotice('off')} />

        {/* Page content: slides sideways between periods, fades between tabs */}
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.main
            key={viewKey}
            initial={{ opacity: 0, x: dir * 90, y: dir ? 0 : 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: dir * -90, filter: 'blur(8px)' }}
            transition={{ duration: 0.4, ease }}
            onAnimationComplete={() => setDir(0)}
            className="mt-10"
          >
            {tab === 'overview' && (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
                  <BudgetHero period={period} anchor={anchor} out={out} inn={inn} saved={saved} count={periodTx.length} budget={budget} budgetKind={budgetKind} onBudget={(n) => patchBook(period === 'week' ? { weeklyBudget: n } : { monthlyBudget: n })} pulse={pulse} />
                  <Accounts txs={periodTx} active={account} onPick={setAccount} />
                </div>
                <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-4 [perspective:1400px] lg:grid-cols-12 lg:gap-5">
                  <motion.div className="origin-bottom lg:col-span-7" {...reveal(0.1)}>
                    <PeriodChart period={period} anchor={anchor} txs={txs} budgetPerBucket={budgetPerBucket} onPick={({ period: p, anchor: a }) => { setDir(0); setPeriod(p); setAnchor(a) }} />
                  </motion.div>
                  <motion.div className="origin-bottom lg:col-span-5" {...reveal(0.2)}>
                    <Categories txs={periodTx} active={category} onPick={setCategory} phrase={phrase} />
                  </motion.div>
                  <motion.div className="origin-bottom lg:col-span-12" {...reveal(0.1)}>
                    <Transactions
                      txs={periodTx}
                      goals={goals}
                      query={query}
                      onQuery={setQuery}
                      typeFilter={typeFilter}
                      onType={setTypeFilter}
                      category={category}
                      onCategory={setCategory}
                      account={account}
                      onAccount={setAccount}
                      onEdit={(t) => setDialog({ editing: t })}
                      onDelete={deleteTx}
                      onAdd={() => openAdd()}
                      highlightId={highlightId}
                    />
                  </motion.div>
                </div>
              </>
            )}
            {tab === 'plan' && <BudgetPlan book={book} month={monthKey(anchor)} txs={periodTx} onBook={patchBook} />}
            {tab === 'bills' && <Bills month={monthKey(anchor)} bills={bills} txs={txs} onBills={setBills} onPay={payBill} onUnpay={(t) => setTxs((list) => list.filter((x) => x.id !== t.id))} />}
            {tab === 'goals' && (
              <Goals goals={goals} wishes={wishes} txs={txs} monthlySavingsGoal={book.monthlySavingsGoal} onGoals={setGoals} onWishes={setWishes} onAddMoney={(goalId) => openAdd({ type: 'save', goalId })} onBuy={buyWish} />
            )}
          </motion.main>
        </AnimatePresence>

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 text-sm text-cream/55 sm:flex-row">
          <p>{user ? `Signed in as ${user.name}. ` : ''}Everything saves automatically on this device.</p>
          <div className="flex gap-4">
            {txs.some((t) => t.sample) || bills.some((b) => b.sample) || goals.some((g) => g.sample) ? (
              <button type="button" onClick={deleteSample} className="underline-offset-2 hover:text-white hover:underline">
                Delete example data
              </button>
            ) : (
              <button type="button" onClick={loadSample} className="underline-offset-2 hover:text-white hover:underline">
                Show example data
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`Delete every entry in “${book.name}”? Bills, goals and the wishlist stay.`)) return
                setTxs([])
                notify('All entries deleted')
              }}
              className="underline-offset-2 hover:text-white hover:underline"
            >
              Delete all entries
            </button>
          </div>
        </footer>
      </div>

      {/* Floating add button on phones */}
      <motion.button type="button" onClick={() => openAdd()} whileTap={{ scale: 0.92 }} aria-label="Add entry" className="fixed right-5 bottom-5 z-40 grid size-15 place-items-center rounded-full bg-lime text-note shadow-[0_14px_40px_-8px_rgba(0,0,0,0.5)] sm:hidden">
        <Plus className="size-7" strokeWidth={2.6} />
      </motion.button>

      <ExpenseDialog
        open={Boolean(dialog)}
        editing={dialog?.editing ?? null}
        defaultAmount={dialog?.amount}
        defaultType={dialog?.type}
        defaultGoalId={dialog?.goalId}
        defaultDate={isCurrent ? todayISO() : range.start}
        goals={goals}
        onCreateGoal={createGoal}
        onCreateCategory={createCategory}
        onRemoveCategory={removeCategory}
        categoryUse={categoryUse}
        onClose={() => setDialog(null)}
        onSave={saveTx}
      />

      <ImportDialog
        open={importOpen}
        bookName={book.name}
        onClose={() => setImportOpen(false)}
        onImport={(r) => {
          setTxs((list) => [...list, ...r.rows])
          setImportOpen(false)
          notify(`Imported ${r.rows.length} entries${r.skipped.length ? `, skipped ${r.skipped.length}` : ''}`)
        }}
      />

      {/* Standalone calculator */}
      <AnimatePresence>
        {calcOpen && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-note-deep/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCalcOpen(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Calculator"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="card w-full max-w-sm p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold">Calculator</h2>
                <button type="button" onClick={() => setCalcOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-wash">
                  <X className="size-5" />
                </button>
              </div>
              <Calculator
                useLabel="Add as an entry"
                onUse={(v) => {
                  setCalcOpen(false)
                  openAdd({ amount: v })
                }}
              />
              <p className="mt-3 text-center text-xs text-muted">Your keyboard works too: numbers, + − * /, Enter and Backspace.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast toast={toast} onDone={() => setToast(null)} />
      <CoinFlight
        flight={flight}
        onLand={() => {
          if (pending.current) landNew(pending.current)
          pending.current = null
          setFlight(null)
        }}
      />
    </>
  )
}
