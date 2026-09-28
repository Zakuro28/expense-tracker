import { motion } from 'motion/react'
import { Wallet } from 'lucide-react'
import { ACCOUNTS, money, type AccountId, type Tx } from '../lib/data'

type Props = { txs: Tx[]; active: AccountId | null; onPick: (a: AccountId | null) => void }

// How much went in and out through each place the money lives
export default function Accounts({ txs, active, onPick }: Props) {
  const rows = ACCOUNTS.map((a) => {
    const list = txs.filter((t) => t.account === a.id)
    const inn = list.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0)
    const out = list.filter((t) => t.type === 'out').reduce((s, t) => s + t.amount, 0)
    return { ...a, inn, out, count: list.length }
  })
  const totalOut = rows.reduce((s, r) => s + r.out, 0) || 1

  return (
    <ul className="space-y-1 rounded-[28px] bg-white/[0.06] p-3 ring-1 ring-white/10 backdrop-blur-md" aria-label="Money by account">
      <li className="flex items-center gap-2 px-3 pt-1 pb-2 text-sm text-cream/65">
        <Wallet className="size-4" aria-hidden /> Paid with and received in
      </li>
      {rows.map((r, i) => {
        const Icon = r.icon
        const on = active === r.id
        return (
          <motion.li key={r.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <button
              type="button"
              onClick={() => onPick(on ? null : r.id)}
              aria-pressed={on}
              className={`group w-full rounded-2xl p-3 text-left transition-colors ${on ? 'bg-white/12 ring-1 ring-lime/40' : 'hover:bg-white/5'} ${active && !on ? 'opacity-50' : ''}`}
            >
              <span className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-cream transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:scale-110 group-hover:-rotate-6">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{r.label}</span>
                  <span className="block text-sm text-cream/55">
                    {r.count === 0 ? 'Not used' : `${money(r.out)} out${r.inn ? `, ${money(r.inn)} in` : ''}`}
                  </span>
                </span>
                <span className="text-sm text-cream/60">{Math.round((r.out / totalOut) * 100)}%</span>
              </span>
              <span className="mt-2 ml-13 block h-1 rounded-full bg-white/10" aria-hidden>
                <motion.span
                  className="block h-full rounded-full bg-lime"
                  initial={{ width: 0 }}
                  animate={{ width: `${(r.out / totalOut) * 100}%` }}
                  transition={{ duration: 0.9, delay: 0.4 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            </button>
          </motion.li>
        )
      })}
    </ul>
  )
}
