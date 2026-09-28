import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Delete } from 'lucide-react'
import { evaluate } from '../lib/calc'
import { money } from '../lib/data'

type Props = {
  initial?: string
  onUse?: (value: number) => void
  useLabel?: string
  /** Listen to the physical keyboard (off while another field has focus) */
  keyboard?: boolean
}

const KEYS = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '%', '0', '.', '⌫'] as const

export default function Calculator({ initial = '', onUse, useLabel = 'Use this amount', keyboard = true }: Props) {
  const [expr, setExpr] = useState(initial)
  const [pressed, setPressed] = useState<string | null>(null)
  const result = evaluate(expr)

  const press = (k: string) => {
    setPressed(k)
    setTimeout(() => setPressed(null), 120)
    if (k === 'C') return setExpr('')
    if (k === '⌫') return setExpr((e) => e.slice(0, -1))
    if (k === '=') return result !== null && setExpr(String(result))
    setExpr((e) => (e + k).slice(0, 40))
  }

  useEffect(() => {
    if (!keyboard) return
    const map: Record<string, string> = { '*': '×', x: '×', '/': '÷', '-': '−', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', Delete: 'C' }
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const k = map[e.key] ?? (/^[\d.+%()]$/.test(e.key) ? e.key : null)
      if (!k) return
      if (k === 'C' && e.key === 'Escape') return // Escape closes dialogs; don't swallow it
      e.preventDefault()
      press(k)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="select-none">
      {/* Display */}
      <div className="rounded-2xl bg-note px-4 py-3 text-right text-white" aria-live="polite">
        <p className="min-h-6 truncate text-lg text-cream/70">{expr || '0'}</p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={result ?? 'none'}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-3xl font-extrabold tracking-tight text-lime"
          >
            {result !== null ? money(result) : '—'}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {KEYS.map((k) => {
          const op = '÷×−+'.includes(k)
          const fn = 'C()%⌫'.includes(k)
          return (
            <motion.button
              key={k}
              type="button"
              onClick={() => press(k)}
              whileTap={{ scale: 0.9 }}
              animate={{ scale: pressed === k ? 0.92 : 1 }}
              aria-label={k === '⌫' ? 'Backspace' : k === 'C' ? 'Clear' : k}
              className={`h-12 rounded-xl text-lg font-semibold transition-colors ${
                op ? 'bg-note-soft text-lime hover:bg-note' : fn ? 'bg-line text-ink-soft hover:bg-[#d4dfd6]' : 'bg-wash text-ink hover:bg-line'
              }`}
            >
              {k === '⌫' ? <Delete className="mx-auto size-5" /> : k}
            </motion.button>
          )
        })}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        <motion.button
          type="button"
          onClick={() => press('=')}
          whileTap={{ scale: 0.95 }}
          className={`h-12 rounded-xl text-lg font-bold ${onUse ? 'col-span-1' : 'col-span-4'} bg-ink text-white hover:bg-note-soft`}
        >
          =
        </motion.button>
        {onUse && (
          <motion.button
            type="button"
            disabled={result === null || result <= 0}
            onClick={() => result !== null && result > 0 && onUse(result)}
            whileTap={{ scale: 0.97 }}
            className="col-span-3 h-12 rounded-xl bg-lime font-bold text-note transition-opacity disabled:opacity-40"
          >
            {useLabel}
          </motion.button>
        )}
      </div>
    </div>
  )
}
