import { AnimatePresence, motion } from 'motion/react'
import { Eye, FlaskConical, Trash2, X } from 'lucide-react'
import type { SampleNotice as Notice } from '../lib/data'

type Props = { state: Notice; onDelete: () => void; onKeep: () => void; onHide: () => void }

const ease = [0.16, 1, 0.3, 1] as const

/** Tells people the first data they see is made up, and lets them clear it */
export default function SampleNotice({ state, onDelete, onKeep, onHide }: Props) {
  return (
    <>
      {/* Welcome message on first open */}
      <AnimatePresence>
        {state === 'intro' && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-note-deep/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sample-title"
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.9 }}
              className="card w-full max-w-md p-6 sm:p-8"
            >
              <motion.span
                className="grid size-14 place-items-center rounded-2xl bg-gold/25 text-[#8a5d00]"
                initial={{ rotate: -25, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 1.2 }}
                aria-hidden
              >
                <FlaskConical className="size-7" />
              </motion.span>
              <h2 id="sample-title" className="mt-5 text-2xl font-extrabold tracking-tight">
                This is example data
              </h2>
              <p className="mt-3 text-ink-soft">
                Pitaka is filled with a year of made-up entries, bills, savings goals and a wishlist, so you can see what your totals and charts will look like after a few months of use.
              </p>
              <p className="mt-3 text-ink-soft">None of it is yours. Delete it whenever you’re ready to add your own money.</p>

              <div className="mt-7 grid gap-2">
                <motion.button type="button" onClick={onDelete} whileTap={{ scale: 0.97 }} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-white transition-colors hover:bg-note-soft">
                  <Trash2 className="size-4.5 text-lime" aria-hidden /> Delete it and start fresh
                </motion.button>
                <motion.button type="button" onClick={onKeep} whileTap={{ scale: 0.97 }} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-wash font-semibold text-ink transition-colors hover:bg-line">
                  <Eye className="size-4.5" aria-hidden /> Look around first
                </motion.button>
              </div>
              <p className="mt-4 text-center text-xs text-muted">Your own entries are never deleted, only the examples.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A quiet reminder while the example data is still there */}
      <AnimatePresence initial={false}>
        {state === 'banner' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease }} className="overflow-hidden">
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-gold/15 py-2.5 pr-2 pl-4 text-sm text-cream ring-1 ring-gold/30">
              <FlaskConical className="size-4.5 shrink-0 text-gold" aria-hidden />
              <p className="min-w-[13rem] flex-1">You’re looking at example data, so these numbers aren’t yours.</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={onDelete} className="rounded-full bg-gold px-3.5 py-1.5 font-semibold text-note transition-transform hover:scale-[1.03]">
                  Delete example data
                </button>
                <button type="button" onClick={onHide} aria-label="Hide this reminder" className="grid size-8 place-items-center rounded-full text-cream/70 hover:bg-white/10 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
