import {
  Banknote,
  Briefcase,
  Bus,
  Clapperboard,
  Coins,
  CreditCard,
  Gift,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PiggyBank,
  Receipt,
  RotateCcw,
  Shapes,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

/* ---------- Money in / money out / moved to savings ---------- */

export type TxType = 'out' | 'in' | 'save'
export type Need = 'need' | 'want'

/* ---------- Categories: colour follows the category, in the validated slot order ---------- */

export type OutCat = 'food' | 'transport' | 'shopping' | 'bills' | 'health' | 'fun' | 'home' | 'other'
export type InCat = 'salary' | 'freelance' | 'gift' | 'refund' | 'extra'
export type CatId = OutCat | InCat | 'savings'
export type Category = { id: CatId; label: string; icon: LucideIcon; color: string; type: TxType; need?: Need }

// `need` is the default for new expenses in that category; each entry can override it
export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', icon: UtensilsCrossed, color: '#2a78d6', type: 'out', need: 'need' },
  { id: 'transport', label: 'Transport', icon: Bus, color: '#eb6834', type: 'out', need: 'need' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#1baf7a', type: 'out', need: 'want' },
  { id: 'bills', label: 'Bills', icon: Receipt, color: '#eda100', type: 'out', need: 'need' },
  { id: 'health', label: 'Health', icon: HeartPulse, color: '#e87ba4', type: 'out', need: 'need' },
  { id: 'fun', label: 'Fun', icon: Clapperboard, color: '#008300', type: 'out', need: 'want' },
  { id: 'home', label: 'Home', icon: House, color: '#4a3aa7', type: 'out', need: 'need' },
  { id: 'other', label: 'Other', icon: Shapes, color: '#e34948', type: 'out', need: 'want' },
]

// Money moved into a savings goal: it leaves your accounts but isn't "spent"
export const SAVINGS_CATEGORY: Category = { id: 'savings', label: 'Savings', icon: PiggyBank, color: '#1f7a4f', type: 'save' }

// Income is charted on its own, so it restarts the same validated order
export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', icon: Briefcase, color: '#2a78d6', type: 'in' },
  { id: 'freelance', label: 'Freelance', icon: Laptop, color: '#eb6834', type: 'in' },
  { id: 'gift', label: 'Gift', icon: Gift, color: '#1baf7a', type: 'in' },
  { id: 'refund', label: 'Refund', icon: RotateCcw, color: '#eda100', type: 'in' },
  { id: 'extra', label: 'Other income', icon: Coins, color: '#e87ba4', type: 'in' },
]

export const ALL_CATEGORIES = [...CATEGORIES, ...INCOME_CATEGORIES, SAVINGS_CATEGORY]
export const CAT: Record<CatId, Category> = Object.fromEntries(ALL_CATEGORIES.map((c) => [c.id, c])) as Record<CatId, Category>
export const catsFor = (t: TxType) => (t === 'out' ? CATEGORIES : t === 'in' ? INCOME_CATEGORIES : [SAVINGS_CATEGORY])
export const defaultNeed = (c: CatId): Need => CAT[c]?.need ?? 'want'

/* ---------- Where the money comes from / goes through ---------- */

export type AccountId = 'cash' | 'card' | 'bank' | 'ewallet'
export type Account = { id: AccountId; label: string; icon: LucideIcon; color: string }

export const ACCOUNTS: Account[] = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: '#2a78d6' },
  { id: 'card', label: 'Credit card', icon: CreditCard, color: '#eb6834' },
  { id: 'bank', label: 'Bank', icon: Landmark, color: '#1baf7a' },
  { id: 'ewallet', label: 'E-wallet', icon: Smartphone, color: '#eda100' },
]
export const ACC: Record<AccountId, Account> = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a])) as Record<AccountId, Account>

/* ---------- Transactions ---------- */

export type Tx = {
  id: string
  type: TxType
  amount: number
  category: CatId
  account: AccountId
  note: string
  date: string // YYYY-MM-DD
  createdAt: number
  need?: Need // expenses only
  goalId?: string // savings only: which goal it went to
  billId?: string // set when created by "Mark paid"
  wishId?: string // set when created by buying a wishlist item
}

/* ---------- Bills, goals, wishlist ---------- */

export type Bill = { id: string; name: string; amount: number; dueDay: number; category: OutCat; account: AccountId }
export type Goal = { id: string; name: string; target: number; deadline?: string; color: string }
export type Wish = { id: string; name: string; price: number; need: Need; category: OutCat; month: string; goalId?: string; boughtTxId?: string }

// Goals are identified by name and icon; these colours are only a small accent
export const GOAL_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
/** @deprecated kept for older imports */
export type Expense = Tx

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/* ---------- Dates (local, no time zones involved) ---------- */

export const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => toISO(new Date())
export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const monthKey = (iso: string) => iso.slice(0, 7)
export const daysInMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
export const shiftMonth = (key: string, by: number) => {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
export const monthName = (key: string, style: 'long' | 'short' = 'long') => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: style })
}
export const monthLabel = (key: string) => `${monthName(key)} ${key.slice(0, 4)}`

export function dayHeading(iso: string) {
  const today = todayISO()
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
  return fromISO(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

/* ---------- Periods: day, week (Monday start), month, year ---------- */

export type Period = 'day' | 'week' | 'month' | 'year'
export type Range = { start: string; end: string } // inclusive

export const weekStart = (iso: string) => {
  const d = fromISO(iso)
  const dow = (d.getDay() + 6) % 7 // Monday = 0
  return addDays(iso, -dow)
}

export function rangeOf(period: Period, anchor: string): Range {
  switch (period) {
    case 'day':
      return { start: anchor, end: anchor }
    case 'week': {
      const s = weekStart(anchor)
      return { start: s, end: addDays(s, 6) }
    }
    case 'month': {
      const k = monthKey(anchor)
      return { start: `${k}-01`, end: `${k}-${pad(daysInMonth(k))}` }
    }
    case 'year': {
      const y = anchor.slice(0, 4)
      return { start: `${y}-01-01`, end: `${y}-12-31` }
    }
  }
}

export function shiftAnchor(period: Period, anchor: string, by: number) {
  switch (period) {
    case 'day':
      return addDays(anchor, by)
    case 'week':
      return addDays(anchor, by * 7)
    case 'month':
      return `${shiftMonth(monthKey(anchor), by)}-01`
    case 'year':
      return `${Number(anchor.slice(0, 4)) + by}-01-01`
  }
}

export function periodLabel(period: Period, anchor: string) {
  const r = rangeOf(period, anchor)
  const short = (iso: string) => fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  switch (period) {
    case 'day':
      return anchor === todayISO() ? 'Today' : fromISO(anchor).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    case 'week':
      return `${short(r.start)} – ${short(r.end)}`
    case 'month':
      return monthLabel(monthKey(anchor))
    case 'year':
      return anchor.slice(0, 4)
  }
}

/** A phrase for sentences: "this week", "in March", "in 2026" */
export function periodPhrase(period: Period, anchor: string) {
  const today = todayISO()
  const current = rangeOf(period, today).start === rangeOf(period, anchor).start
  if (current) return { day: 'today', week: 'this week', month: 'this month', year: 'this year' }[period]
  if (period === 'day') return `on ${periodLabel('day', anchor)}`
  if (period === 'week') return `the week of ${periodLabel('week', anchor)}`
  return `in ${period === 'month' ? monthName(monthKey(anchor)) : anchor.slice(0, 4)}`
}

export const inRange = (iso: string, r: Range) => iso >= r.start && iso <= r.end

/* ---------- Money ---------- */

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pesoWhole = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })

export const money = (n: number) => peso.format(n)
export const moneyWhole = (n: number) => pesoWhole.format(Math.round(n))
export const moneyShort = (n: number) => (n >= 1000 ? `₱${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `₱${Math.round(n)}`)

export const sum = (list: Tx[], type?: TxType) => list.reduce((s, t) => (!type || t.type === type ? s + t.amount : s), 0)

/* ---------- Storage (browser storage may be blocked; never crash on it) ---------- */

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

/* ---------- Books: separate databases, each with its own entries and budgets ---------- */

export type Book = {
  id: string
  name: string
  monthlyBudget: number
  weeklyBudget: number
  monthlySavingsGoal: number
  categoryBudgets: Partial<Record<OutCat, number>>
}

export const DEFAULT_CATEGORY_BUDGETS: Record<OutCat, number> = {
  food: 12000,
  transport: 6000,
  shopping: 5000,
  bills: 6000,
  health: 2000,
  fun: 3000,
  home: 8000,
  other: 3000,
}

export const newBook = (name: string): Book => ({
  id: uid(),
  name,
  monthlyBudget: 45000,
  weeklyBudget: 10000,
  monthlySavingsGoal: 8000,
  categoryBudgets: { ...DEFAULT_CATEGORY_BUDGETS },
})

// Fill in fields added after a book was first saved
export const upgradeBook = (b: Partial<Book> & { id: string; name: string }): Book => ({
  monthlyBudget: 45000,
  weeklyBudget: 10000,
  monthlySavingsGoal: 8000,
  categoryBudgets: { ...DEFAULT_CATEGORY_BUDGETS },
  ...b,
})

// Every signed-in person gets their own storage space on this device
let NS = 'pitaka'
export const setStorageUser = (userId: string | null) => {
  NS = userId ? `pitaka:u:${userId}` : 'pitaka'
}
export const nsKey = (k: string) => `${NS}:${k}`

export const bookKey = (id: string) => nsKey(`tx:${id}`)
export const billsKey = (id: string) => nsKey(`bills:${id}`)
export const goalsKey = (id: string) => nsKey(`goals:${id}`)
export const wishKey = (id: string) => nsKey(`wish:${id}`)

/** Upgrade older saved data (expenses only, no accounts) into the first book */
/**
 * The signed-in person's books. On their first sign-in this creates a "Personal" book,
 * either empty or filled with sample data. The first account on a device also inherits
 * anything saved by the earlier, sign-in-free version of the app.
 */
export function loadBooks(opts: { withSample?: boolean; adoptLegacy?: boolean } = {}): { books: Book[]; activeId: string } {
  const books = load<Book[] | null>(nsKey('books'), null)
  if (books && books.length) {
    const upgraded = books.map(upgradeBook)
    return { books: upgraded, activeId: load(nsKey('active'), upgraded[0].id) }
  }

  const legacy = opts.adoptLegacy ? load<Partial<Tx>[] | null>('pitaka:expenses', null) : null
  const personal: Book = { ...newBook('Personal'), id: 'personal' }
  const sample = opts.withSample ? sampleData() : { txs: [], bills: [], goals: [], wishes: [] }
  const tx: Tx[] = legacy
    ? legacy.map((e) => ({ id: e.id ?? uid(), type: 'out', amount: e.amount ?? 0, category: (e.category as CatId) ?? 'other', account: 'cash', note: e.note ?? '', date: e.date ?? todayISO(), createdAt: e.createdAt ?? Date.now(), need: defaultNeed((e.category as CatId) ?? 'other') }))
    : sample.txs
  save(bookKey(personal.id), tx)
  save(billsKey(personal.id), sample.bills)
  save(goalsKey(personal.id), sample.goals)
  save(wishKey(personal.id), sample.wishes)
  save(nsKey('books'), [personal])
  return { books: [personal], activeId: personal.id }
}

export const loadTx = (bookId: string) =>
  load<Tx[]>(bookKey(bookId), []).map((t) => (t.type === 'out' && !t.need ? { ...t, need: defaultNeed(t.category) } : t))

/* ---------- Bill status for a given month ---------- */

export type BillStatus = { bill: Bill; due: string; paidTx?: Tx; state: 'paid' | 'overdue' | 'soon' | 'upcoming' }

export function billStatuses(bills: Bill[], txs: Tx[], month: string): BillStatus[] {
  const today = todayISO()
  return bills
    .map((bill) => {
      const due = `${month}-${pad(Math.min(bill.dueDay, daysInMonth(month)))}`
      const paidTx = txs.find((t) => t.billId === bill.id && monthKey(t.date) === month)
      const daysAway = Math.round((fromISO(due).getTime() - fromISO(today).getTime()) / 86400000)
      const state: BillStatus['state'] = paidTx ? 'paid' : daysAway < 0 ? 'overdue' : daysAway <= 5 ? 'soon' : 'upcoming'
      return { bill, due, paidTx, state }
    })
    .sort((a, b) => (a.due < b.due ? -1 : 1))
}

export const goalSaved = (goalId: string, txs: Tx[]) => txs.reduce((s, t) => (t.type === 'save' && t.goalId === goalId ? s + t.amount : s), 0)

/* ---------- Sample data: the last 12 months up to today ---------- */

const SAMPLES: [OutCat, string, number, number][] = [
  ['food', 'Jollibee lunch', 180, 320],
  ['food', 'Coffee', 120, 210],
  ['food', 'Groceries at SM', 1200, 2600],
  ['food', 'Carinderia dinner', 90, 160],
  ['food', 'Milk tea', 110, 180],
  ['transport', 'Jeepney fare', 26, 52],
  ['transport', 'Grab to the office', 180, 380],
  ['transport', 'Gas', 900, 1500],
  ['shopping', 'Shopee order', 300, 1400],
  ['shopping', 'New shirt', 450, 900],
  ['health', 'Mercury Drug', 150, 700],
  ['fun', 'Cinema', 350, 600],
  ['home', 'Laundry', 180, 260],
  ['home', 'Cleaning supplies', 220, 480],
  ['other', 'Gift for Mama', 500, 1500],
]

const SAMPLE_BILLS: Bill[] = [
  { id: 'bill-rent', name: 'Rent share', amount: 6500, dueDay: 1, category: 'home', account: 'bank' },
  { id: 'bill-meralco', name: 'Meralco', amount: 2180.5, dueDay: 5, category: 'bills', account: 'ewallet' },
  { id: 'bill-globe', name: 'Globe postpaid', amount: 999, dueDay: 8, category: 'bills', account: 'card' },
  { id: 'bill-water', name: 'Water (Maynilad)', amount: 412.75, dueDay: 12, category: 'bills', account: 'ewallet' },
  { id: 'bill-internet', name: 'PLDT internet', amount: 1699, dueDay: 15, category: 'bills', account: 'card' },
  { id: 'bill-netflix', name: 'Netflix', amount: 549, dueDay: 28, category: 'fun', account: 'card' },
]

const SAMPLE_GOALS: Goal[] = [
  { id: 'goal-emergency', name: 'Emergency fund', target: 60000, color: GOAL_COLORS[0] },
  { id: 'goal-laptop', name: 'New laptop', target: 55000, color: GOAL_COLORS[1] },
  { id: 'goal-trip', name: 'Siargao trip', target: 25000, color: GOAL_COLORS[2] },
]

const INCOME: [number, InCat, string, number, AccountId][] = [
  [10, 'salary', 'Salary (1st half)', 32000, 'bank'],
  [25, 'salary', 'Salary (2nd half)', 32000, 'bank'],
]

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function pickAccount(r: number, cat: OutCat): AccountId {
  if (cat === 'transport' && r < 0.6) return 'cash'
  if (r < 0.45) return 'cash'
  if (r < 0.7) return 'ewallet'
  if (r < 0.9) return 'card'
  return 'bank'
}

export function sampleData(): { txs: Tx[]; bills: Bill[]; goals: Goal[]; wishes: Wish[] } {
  const out: Tx[] = []
  const now = new Date()
  for (let back = 11; back >= 0; back--) {
    const first = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const key = toISO(first).slice(0, 7)
    const last = back === 0 ? now.getDate() : daysInMonth(key)
    const rnd = seeded(first.getMonth() * 97 + first.getFullYear())
    const stamp = (day: number, i = 0) => first.getTime() + day * 1000 + i

    // Bills paid on their due day; this month's water bill is left unpaid to show "overdue"
    for (const b of SAMPLE_BILLS) {
      const d = Math.min(b.dueDay, daysInMonth(key))
      if (d > last || (back === 0 && b.id === 'bill-water')) continue
      out.push({ id: uid(), type: 'out', amount: b.amount, category: b.category, account: b.account, note: b.name, date: `${key}-${pad(d)}`, createdAt: stamp(d), need: defaultNeed(b.category), billId: b.id })
    }
    // Savings moved into goals
    const saves: [number, string, number][] = [
      [16, 'goal-emergency', 5000],
      [2, 'goal-laptop', 2500],
      ...(back < 4 ? ([[25, 'goal-trip', 1500]] as [number, string, number][]) : []),
    ]
    for (const [day, goalId, amount] of saves)
      if (day <= last) out.push({ id: uid(), type: 'save', amount, category: 'savings', account: 'bank', note: SAMPLE_GOALS.find((g) => g.id === goalId)!.name, date: `${key}-${pad(day)}`, createdAt: stamp(day, 7), goalId })

    for (const [day, category, note, amount, account] of INCOME) {
      const d = Math.min(day, daysInMonth(key))
      if (d <= last) out.push({ id: uid(), type: 'in', amount, category, account, note, date: `${key}-${pad(d)}`, createdAt: stamp(d, 9) })
    }
    if (rnd() > 0.5 && 20 <= last)
      out.push({ id: uid(), type: 'in', amount: Math.round(3000 + rnd() * 9000), category: 'freelance', account: 'ewallet', note: 'Website project', date: `${key}-20`, createdAt: stamp(20, 8) })

    for (let day = 1; day <= last; day++) {
      const count = 1 + Math.floor(rnd() * 3)
      for (let i = 0; i < count; i++) {
        const [category, note, min, max] = SAMPLES[Math.floor(rnd() * SAMPLES.length)]
        const amount = Math.round((min + rnd() * (max - min)) * 4) / 4
        out.push({ id: uid(), type: 'out', amount, category, account: pickAccount(rnd(), category), note, date: `${key}-${pad(day)}`, createdAt: stamp(day, i), need: defaultNeed(category) })
      }
    }
  }

  const thisMonth = monthKey(todayISO())
  const wishes: Wish[] = [
    { id: uid(), name: 'MacBook Air M4', price: 55000, need: 'need', category: 'shopping', month: shiftMonth(thisMonth, 3), goalId: 'goal-laptop' },
    { id: uid(), name: 'Running shoes', price: 4500, need: 'want', category: 'shopping', month: shiftMonth(thisMonth, 1) },
    { id: uid(), name: 'Dental cleaning', price: 1500, need: 'need', category: 'health', month: thisMonth },
    { id: uid(), name: 'Siargao flights', price: 9800, need: 'want', category: 'fun', month: shiftMonth(thisMonth, 2), goalId: 'goal-trip' },
  ]
  return { txs: out, bills: SAMPLE_BILLS, goals: SAMPLE_GOALS, wishes }
}
export const sampleTransactions = () => sampleData().txs
