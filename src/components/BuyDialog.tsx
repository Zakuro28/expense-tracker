import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PiggyBank, ShoppingCart, X } from 'lucide-react'
import { evaluate } from '../lib/calc'
import { ACCOUNTS, MAX_AMOUNT, goalSaved, money, todayISO, type AccountId, type Goal, type Tx, type Wish } from '../lib/data'

type Props = {
  wish: Wish | null
  goals: Goal[]
  txs: Tx[]
  onClose: () => void
  onConfirm: (w: Wish, paid: { price: number; account: AccountId; date: string }) => void
}

/** Confirms a wishlist purchase: the real price paid, the account and the date */
export default function BuyDialog({ wish, goals, txs, onClose, onConfirm }: Props) {
  useEffect(() => {
    if (!wish) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wish, onClose])

  return (
    <AnimatePresence>
      {wish && (
        <motion.div key={wish.id} className="fixed inset-0 z-50 grid place-items-center bg-note-deep/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <BuyForm wish={wish} goals={goals} txs={txs} onClose={onClose} onConfirm={onConfirm} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* Fresh fields for each item: mounted per wish, so nothing needs resetting */
function BuyForm({ wish, goals, txs, onClose, onConfirm }: Omit<Props, 'wish'> & { wish: Wish }) {
  const [price, setPrice] = useState(String(wish.price))
  const [account, setAccount] = useState<AccountId>('bank')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')

  const goal = goals.find((g) => g.id === wish.goalId)
  const paid = evaluate(price)
  const inGoal = goal ? Math.max(goalSaved(goal.id, txs), 0) : 0
  const fromGoal = paid && paid > 0 ? Math.min(inGoal, paid) : 0

  const confirm = () => {
    if (paid === null || paid <= 0) return setError('Enter the price you paid.')
    if (paid > MAX_AMOUNT) return setError(`That’s more than ${money(MAX_AMOUNT)}. Check the amount.`)
    onConfirm(wish, { price: Math.round(paid * 100) / 100, account, date })
  }

  return (
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="buy-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              confirm()
            }}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="card w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="buy-title" className="text-lg font-bold">
                Buy {wish.name}
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-wash">
                <X className="size-5" />
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-sm text-muted">Price you paid</span>
              <span className="mt-1 flex items-center gap-1 rounded-xl border border-line bg-wash px-3 focus-within:border-leaf focus-within:bg-white">
                <span className="text-muted">₱</span>
                <input
                  autoFocus
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value.replace(/[^\d.,+\-*/x×÷%()−\s]/g, ''))
                    setError('')
                  }}
                  inputMode="decimal"
                  aria-invalid={Boolean(error)}
                  className="num h-11 w-full bg-transparent text-lg font-semibold outline-none"
                />
              </span>
              {paid !== null && paid !== wish.price && paid > 0 && <span className="mt-1 block text-xs text-muted">Planned at {money(wish.price)}</span>}
            </label>

            <fieldset className="mt-4">
              <legend className="text-sm text-muted">Paid with</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ACCOUNTS.map((a) => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={account === a.id}
                      onClick={() => setAccount(a.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${account === a.id ? 'bg-ink text-white' : 'bg-wash text-ink-soft hover:bg-line'}`}
                    >
                      <Icon className="size-4" aria-hidden /> {a.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <label className="mt-4 block">
              <span className="text-sm text-muted">Date</span>
              <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} className="mt-1 h-11 w-full rounded-xl border border-line bg-wash px-3 outline-none focus:border-leaf focus:bg-white" />
            </label>

            {goal && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-leaf/10 p-3 text-sm text-ink-soft">
                <PiggyBank className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden />
                <span>
                  {fromGoal > 0 ? (
                    <>
                      <b className="text-ink">{money(fromGoal)}</b> comes from your {goal.name} goal, so only{' '}
                      <b className="text-ink">{money(Math.max((paid ?? 0) - fromGoal, 0))}</b> counts against this month’s budget.
                    </>
                  ) : (
                    <>Your {goal.name} goal is empty, so the full price counts against this month’s budget.</>
                  )}
                </span>
              </p>
            )}

            {error && <p className="mt-3 text-sm font-medium text-critical">{error}</p>}

            <motion.button type="submit" whileTap={{ scale: 0.97 }} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-white">
              <ShoppingCart className="size-4.5 text-lime" aria-hidden /> Record purchase
            </motion.button>
          </motion.form>
  )
}
