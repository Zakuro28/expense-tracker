import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, Undo2 } from 'lucide-react'

export type ToastMsg = { id: number; text: string; undo?: () => void }

export default function Toast({ toast, onDone }: { toast: ToastMsg | null; onDone: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-full bg-ink py-2 pr-2 pl-4 text-white shadow-2xl"
          >
            <CircleCheck className="size-5 text-lime" aria-hidden />
            <span className="text-sm font-medium">{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.()
                  onDone()
                }}
                className="flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
              >
                <Undo2 className="size-4" aria-hidden /> Undo
              </button>
            )}
            {/* Time left before it goes */}
            <motion.span
              className="absolute bottom-0 left-0 h-0.5 bg-lime"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
