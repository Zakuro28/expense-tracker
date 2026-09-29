import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Tags, Trash2, X } from 'lucide-react'
import {
  CATEGORY_NAME_MAX,
  CUSTOM_COLOR,
  CUSTOM_ICONS,
  catsFor,
  type CatId,
  type CustomCategory,
  type CustomIcon,
  type Need,
} from '../lib/data'

type Props = {
  open: boolean
  categories: CustomCategory[]
  categoryUse: (id: CatId) => number
  onUpdate: (c: CustomCategory) => void
  onDelete: (id: CatId) => void
  onMoveAndDelete: (id: CatId, to: CatId) => void
  onClose: () => void
}

function Row({ cat, uses, onUpdate, onDelete, onMoveAndDelete }: { cat: CustomCategory; uses: number; onUpdate: Props['onUpdate']; onDelete: Props['onDelete']; onMoveAndDelete: Props['onMoveAndDelete'] }) {
  const [name, setName] = useState(cat.label)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Where a used category's entries go when it's deleted: any other category of the same kind
  const targets = catsFor(cat.type).filter((c) => c.id !== cat.id)
  const [moveTo, setMoveTo] = useState<CatId>(targets[0]?.id ?? 'other')
  const Icon = CUSTOM_ICONS[cat.icon]

  const saveName = () => {
    const n = name.trim()
    if (!n) {
      setName(cat.label)
      return setError('')
    }
    if (n.length > CATEGORY_NAME_MAX) return setError(`Keep the name to ${CATEGORY_NAME_MAX} characters or fewer.`)
    const clash = catsFor(cat.type).some((c) => c.id !== cat.id && c.label.toLowerCase() === n.toLowerCase())
    if (clash) return setError(`You already have a “${n}” category.`)
    setError('')
    if (n !== cat.label) onUpdate({ ...cat, label: n })
  }

  return (
    <li className="rounded-2xl p-3 ring-1 ring-line">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          aria-expanded={picking}
          aria-label={`Change icon for ${cat.label}`}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-white transition-transform hover:scale-105"
          style={{ background: CUSTOM_COLOR }}
        >
          <Icon className="size-4.5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={name}
            maxLength={CATEGORY_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setName(cat.label)
            }}
            aria-label={`Name of ${cat.label}`}
            className="h-9 w-full rounded-lg border border-transparent bg-transparent px-2 font-semibold outline-none hover:border-line focus:border-leaf focus:bg-white"
          />
          <p className="px-2 text-xs text-muted">
            {cat.type === 'out' ? 'Spending' : 'Income'}, used by {uses} {uses === 1 ? 'item' : 'items'}
          </p>
        </div>
        {cat.type === 'out' && (
          <div role="radiogroup" aria-label={`${cat.label} is usually a`} className="hidden rounded-full bg-wash p-1 sm:flex">
            {(['need', 'want'] as Need[]).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={(cat.need ?? 'want') === n}
                onClick={() => onUpdate({ ...cat, need: n })}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${(cat.need ?? 'want') === n ? 'bg-ink text-white' : 'text-ink-soft'}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => (uses > 0 ? setDeleting((v) => !v) : onDelete(cat.id))} aria-label={`Delete the ${cat.label} category`} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-[#fde8e6] hover:text-critical">
          <Trash2 className="size-4" />
        </button>
      </div>
      {error && <p className="mt-1 px-2 text-sm font-medium text-critical">{error}</p>}

      <AnimatePresence initial={false}>
        {picking && (
          <motion.div key="icons" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div role="radiogroup" aria-label="Icon" className="mt-3 grid grid-cols-6 gap-1.5">
              {(Object.keys(CUSTOM_ICONS) as CustomIcon[]).map((k) => {
                const I = CUSTOM_ICONS[k]
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={cat.icon === k}
                    aria-label={k}
                    onClick={() => {
                      onUpdate({ ...cat, icon: k })
                      setPicking(false)
                    }}
                    className={`grid h-9 place-items-center rounded-xl ${cat.icon === k ? 'bg-ink text-lime' : 'bg-wash text-ink-soft hover:bg-line'}`}
                  >
                    <I className="size-4" aria-hidden />
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
        {deleting && (
          <motion.div key="move" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-xl bg-[#fde8e6]/60 p-3 text-sm">
              <p className="text-ink-soft">
                Move its {uses} {uses === 1 ? 'item' : 'items'} to another category, then delete “{cat.label}”.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ArrowRight className="size-4 text-muted" aria-hidden />
                <select value={moveTo} onChange={(e) => setMoveTo(e.target.value as CatId)} aria-label="Move items to" className="h-9 rounded-lg border border-line bg-white px-2">
                  {targets.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => onMoveAndDelete(cat.id, moveTo)} className="rounded-full bg-critical px-3.5 py-1.5 font-semibold text-white">
                  Move and delete
                </button>
                <button type="button" onClick={() => setDeleting(false)} className="rounded-full px-3 py-1.5 font-semibold text-ink-soft hover:bg-white/60">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/** Rename, re-icon, or delete the categories someone added themselves */
export default function CategoryManager({ open, categories, categoryUse, onUpdate, onDelete, onMoveAndDelete, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const groups = [
    { type: 'out' as const, title: 'Spending categories' },
    { type: 'in' as const, title: 'Income categories' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-note-deep/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cats-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="card my-auto w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="cats-title" className="flex items-center gap-2 text-lg font-bold">
                <Tags className="size-5 text-leaf" aria-hidden /> Your categories
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-wash">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">Rename them, change their icon, or delete them. Entries in a deleted category move to the one you pick.</p>

            {categories.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-wash p-5 text-center text-sm text-ink-soft">You haven’t added any categories yet. Use “New category” in the add form to make one.</p>
            ) : (
              groups.map((g) => {
                const list = categories.filter((c) => c.type === g.type)
                if (!list.length) return null
                return (
                  <section key={g.type} className="mt-5">
                    <h3 className="text-sm font-semibold text-ink-soft">{g.title}</h3>
                    <ul className="mt-2 space-y-2">
                      {list.map((c) => (
                        <Row key={c.id} cat={c} uses={categoryUse(c.id)} onUpdate={onUpdate} onDelete={onDelete} onMoveAndDelete={onMoveAndDelete} />
                      ))}
                    </ul>
                  </section>
                )
              })
            )}

            <button type="button" onClick={onClose} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-semibold text-white">
              <Check className="size-4.5 text-lime" aria-hidden /> Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
