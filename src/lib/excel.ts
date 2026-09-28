import * as XLSX from 'xlsx'
import { ACC, ACCOUNTS, ALL_CATEGORIES, CAT, INCOME_CATEGORIES, defaultNeed, monthKey, monthLabel, uid, type AccountId, type CatId, type Tx, type TxType } from './data'

const HEADERS = ['Date', 'Type', 'Category', 'Account', 'Note', 'Amount'] as const

/* ---------- Export ---------- */

export function exportToExcel(txs: Tx[], bookName: string, scopeLabel: string) {
  const sorted = [...txs].sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))

  // Sheet 1: every transaction, amounts as real numbers so Excel can sum them
  const TYPE_LABEL = { in: 'Money in', out: 'Money out', save: 'Savings' } as const
  const rows = sorted.map((t) => ({
    Date: t.date,
    Type: TYPE_LABEL[t.type],
    Category: CAT[t.category]?.label ?? t.category,
    Account: ACC[t.account]?.label ?? t.account,
    Note: t.note,
    Amount: t.type === 'in' ? t.amount : -t.amount,
    'Need or want': t.type === 'out' ? (t.need === 'need' ? 'Need' : 'Want') : '',
  }))
  const txSheet = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS, 'Need or want'] })
  txSheet['!cols'] = [{ wch: 12 }, { wch: 11 }, { wch: 14 }, { wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 13 }]
  for (let r = 1; r <= rows.length; r++) {
    const cell = txSheet[XLSX.utils.encode_cell({ r, c: 5 })]
    if (cell) cell.z = '"₱"#,##0.00;[Red]-"₱"#,##0.00'
  }

  // Sheet 2: month by month
  const months = new Map<string, { in: number; out: number; save: number }>()
  for (const t of sorted) {
    const m = months.get(monthKey(t.date)) ?? { in: 0, out: 0, save: 0 }
    m[t.type] += t.amount
    months.set(monthKey(t.date), m)
  }
  const monthRows = [...months.entries()].map(([k, v]) => ({ Month: monthLabel(k), 'Money in': v.in, 'Money out': v.out, Saved: v.save, 'Left over': v.in - v.out - v.save }))

  // Sheet 3: by category; Sheet 4: by account
  const byCat = ALL_CATEGORIES.map((c) => ({
    Category: c.label,
    Type: TYPE_LABEL[c.type],
    Total: sorted.filter((t) => t.category === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter((r) => r.Total > 0)
  const byAcc = ACCOUNTS.map((a) => {
    const list = sorted.filter((t) => t.account === a.id)
    const inn = list.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const out = list.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    return { Account: a.label, 'Money in': inn, 'Money out': out, Net: inn - out }
  })

  const money = '"₱"#,##0.00;[Red]-"₱"#,##0.00'
  const sheet = (data: object[], widths: number[]) => {
    const s = XLSX.utils.json_to_sheet(data)
    s['!cols'] = widths.map((wch) => ({ wch }))
    const range = XLSX.utils.decode_range(s['!ref'] ?? 'A1')
    for (let r = 1; r <= range.e.r; r++)
      for (let c = 0; c <= range.e.c; c++) {
        const cell = s[XLSX.utils.encode_cell({ r, c })]
        if (cell && typeof cell.v === 'number') cell.z = money
      }
    return s
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions')
  XLSX.utils.book_append_sheet(wb, sheet(monthRows, [18, 14, 14, 14]), 'By month')
  XLSX.utils.book_append_sheet(wb, sheet(byCat, [16, 11, 14]), 'By category')
  XLSX.utils.book_append_sheet(wb, sheet(byAcc, [14, 14, 14, 14]), 'By account')

  const safe = `${bookName} ${scopeLabel}`.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')
  XLSX.writeFile(wb, `Pitaka-${safe}.xlsx`)
}

/* ---------- Import ---------- */

export type ImportResult = { rows: Tx[]; skipped: { row: number; reason: string }[] }

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

function findCategory(label: string, type: TxType): CatId {
  const l = norm(label)
  const hit = ALL_CATEGORIES.find((c) => norm(c.label) === l || c.id === l)
  if (hit) return hit.id
  return type === 'in' ? 'extra' : 'other'
}

function findAccount(label: string): AccountId {
  const l = norm(label)
  const hit = ACCOUNTS.find((a) => norm(a.label) === l || a.id === l)
  if (hit) return hit.id
  if (/card|credit|visa|master/.test(l)) return 'card'
  if (/bank|bdo|bpi|metrobank|debit/.test(l)) return 'bank'
  if (/gcash|maya|wallet|paymaya/.test(l)) return 'ewallet'
  return 'cash'
}

function toDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  const s = String(v ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return toDate(d)
  return null
}

/** Reads the first sheet of an .xlsx/.xls/.csv file with Date, Type, Category, Account, Note, Amount columns */
export async function importFromFile(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const first = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(first, { defval: '' })

  const rows: Tx[] = []
  const skipped: ImportResult['skipped'] = []

  raw.forEach((r, i) => {
    // Match columns case-insensitively
    const get = (name: string) => {
      const key = Object.keys(r).find((k) => norm(k) === name)
      return key ? r[key] : ''
    }
    const rowNo = i + 2 // header is row 1
    const rawAmount = get('amount')
    const amountNum = typeof rawAmount === 'number' ? rawAmount : Number(String(rawAmount).replace(/[₱,\s]/g, ''))
    if (!Number.isFinite(amountNum) || amountNum === 0) {
      skipped.push({ row: rowNo, reason: 'missing or invalid amount' })
      return
    }
    const date = toDate(get('date'))
    if (!date) {
      skipped.push({ row: rowNo, reason: 'missing or invalid date' })
      return
    }
    // Type column wins; without one, an income category means money in
    const typeText = norm(get('type'))
    const incomeCategory = INCOME_CATEGORIES.some((c) => norm(c.label) === norm(get('category')) || c.id === norm(get('category')))
    let type: TxType = 'out'
    if (typeText) type = /^(in|money in|income|inflow|deposit)$/.test(typeText) ? 'in' : /^sav/.test(typeText) ? 'save' : 'out'
    else if (incomeCategory && amountNum > 0) type = 'in'
    const needText = norm(get('need or want'))

    const category = type === 'save' ? 'savings' : findCategory(String(get('category')), type)
    rows.push({
      id: uid(),
      type,
      amount: Math.round(Math.abs(amountNum) * 100) / 100,
      category,
      ...(type === 'out' ? { need: needText === 'need' ? 'need' : needText === 'want' ? 'want' : defaultNeed(category) } : {}),
      account: findAccount(String(get('account'))),
      note: String(get('note') ?? '').slice(0, 60),
      date,
      createdAt: Date.now() + i,
    } as Tx)
  })

  return { rows, skipped }
}

/** A blank file with the right columns, so people know the format */
export function downloadTemplate() {
  const s = XLSX.utils.json_to_sheet([
    { Date: '2026-09-01', Type: 'Money out', Category: 'Food', Account: 'Cash', Note: 'Lunch', Amount: 250 },
    { Date: '2026-09-15', Type: 'Money in', Category: 'Salary', Account: 'Bank', Note: 'Salary', Amount: 26000 },
  ])
  s['!cols'] = [{ wch: 12 }, { wch: 11 }, { wch: 14 }, { wch: 12 }, { wch: 32 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, s, 'Transactions')
  XLSX.writeFile(wb, 'Pitaka-import-template.xlsx')
}
