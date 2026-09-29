import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, Calculator, Check, ChevronDown, Download, FileSpreadsheet, FolderPlus, LogIn, LogOut, Pencil, Tags, Trash2, Upload, UserPlus, UserRound, UserX, Wrench } from 'lucide-react'
import type { Book } from '../lib/data'
import type { PublicUser } from '../lib/auth'

/* A small popover that closes on outside click or Escape */
function Popover({ button, children, align = 'right', label }: { button: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}>
        {button(open)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`card absolute top-full z-50 mt-2 w-72 p-2 ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-wash'

export function BookSwitcher({ books, activeId, onSwitch, onCreate, onRename, onDelete }: { books: Book[]; activeId: string; onSwitch: (id: string) => void; onCreate: (name: string) => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void }) {
  const active = books.find((b) => b.id === activeId)
  const [naming, setNaming] = useState<'new' | 'rename' | null>(null)
  const [name, setName] = useState('')
  return (
    <Popover
      label={`Book: ${active?.name}. Switch book`}
      align="left"
      button={(open) => (
        <span className="flex items-center gap-2 rounded-full bg-white/8 py-2 pr-3 pl-3 text-sm font-semibold text-white ring-1 ring-white/10 transition-colors hover:bg-white/12">
          <BookOpen className="size-4 text-lime" aria-hidden />
          <span className="max-w-28 truncate">{active?.name}</span>
          <ChevronDown className={`size-4 text-cream/60 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pt-1 pb-2 text-xs text-muted">Books keep separate entries, bills, goals and budgets.</p>
          {books.map((b) => (
            <button key={b.id} type="button" role="menuitemradio" aria-checked={b.id === activeId} onClick={() => { onSwitch(b.id); close() }} className={item}>
              <BookOpen className="size-4 text-leaf" aria-hidden />
              <span className="flex-1 truncate">{b.name}</span>
              {b.id === activeId && <Check className="size-4 text-leaf" aria-hidden />}
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          {naming ? (
            <form
              className="flex gap-2 p-1"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim()) return
                if (naming === 'new') onCreate(name.trim())
                else onRename(activeId, name.trim())
                setNaming(null)
                setName('')
                close()
              }}
            >
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={naming === 'new' ? 'Business, Family…' : 'New name'} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-wash px-3 text-sm text-ink outline-none focus:border-leaf" />
              <button type="submit" className="rounded-xl bg-ink px-3 text-sm font-semibold text-white">
                {naming === 'new' ? 'Create' : 'Save'}
              </button>
            </form>
          ) : (
            <>
              <button type="button" onClick={() => { setNaming('new'); setName('') }} className={item}>
                <FolderPlus className="size-4" aria-hidden /> New book
              </button>
              <button type="button" onClick={() => { setNaming('rename'); setName(active?.name ?? '') }} className={item}>
                <Pencil className="size-4" aria-hidden /> Rename “{active?.name}”
              </button>
              {books.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete the “${active?.name}” book and everything in it? This can’t be undone.`)) {
                      onDelete(activeId)
                      close()
                    }
                  }}
                  className={`${item} text-critical hover:bg-[#fde8e6]`}
                >
                  <Trash2 className="size-4" aria-hidden /> Delete this book
                </button>
              )}
            </>
          )}
        </>
      )}
    </Popover>
  )
}

export function ToolsMenu({ onCalculator, onCategories, onExportPeriod, onExportAll, onImport, periodLabel }: { onCalculator: () => void; onCategories: () => void; onExportPeriod: () => void; onExportAll: () => void; onImport: () => void; periodLabel: string }) {
  return (
    <Popover
      label="Tools"
      button={() => (
        <span className="grid size-10 place-items-center rounded-full bg-white/8 text-white ring-1 ring-white/10 transition-colors hover:bg-white/12">
          <Wrench className="size-4.5" aria-hidden />
        </span>
      )}
    >
      {(close) => (
        <>
          <button type="button" role="menuitem" onClick={() => { onCalculator(); close() }} className={item}>
            <Calculator className="size-4 text-leaf" aria-hidden /> Calculator
          </button>
          <button type="button" role="menuitem" onClick={() => { onCategories(); close() }} className={item}>
            <Tags className="size-4 text-leaf" aria-hidden /> Manage categories
          </button>
          <div className="my-1 border-t border-line" />
          <p className="px-3 pt-1 pb-1 text-xs text-muted">Excel</p>
          <button type="button" role="menuitem" onClick={() => { onExportPeriod(); close() }} className={item}>
            <Download className="size-4 text-leaf" aria-hidden /> Export {periodLabel}
          </button>
          <button type="button" role="menuitem" onClick={() => { onExportAll(); close() }} className={item}>
            <FileSpreadsheet className="size-4 text-leaf" aria-hidden /> Export everything
          </button>
          <button type="button" role="menuitem" onClick={() => { onImport(); close() }} className={item}>
            <Upload className="size-4 text-leaf" aria-hidden /> Import from Excel or CSV
          </button>
        </>
      )}
    </Popover>
  )
}

export function UserMenu({ user, onSignIn, onLogout, onDeleteAccount }: { user: PublicUser | null; onSignIn: (mode: 'in' | 'up') => void; onLogout: () => void; onDeleteAccount: () => void }) {
  if (!user)
    return (
      <Popover
        label="Not signed in. Account menu"
        button={() => (
          <span className="grid size-10 place-items-center rounded-full bg-white/8 text-white ring-1 ring-white/15 transition-colors hover:bg-white/12">
            <UserRound className="size-4.5" aria-hidden />
          </span>
        )}
      >
        {(close) => (
          <>
            <div className="px-3 py-2">
              <p className="font-semibold text-ink">Using Pitaka without an account</p>
              <p className="mt-1 text-sm text-muted">Everything still saves on this device. Sign in if other people use it too and you want your own private space.</p>
            </div>
            <div className="my-1 border-t border-line" />
            <button type="button" role="menuitem" onClick={() => { close(); onSignIn('in') }} className={item}>
              <LogIn className="size-4 text-leaf" aria-hidden /> Sign in
            </button>
            <button type="button" role="menuitem" onClick={() => { close(); onSignIn('up') }} className={item}>
              <UserPlus className="size-4 text-leaf" aria-hidden /> Create an account
            </button>
          </>
        )}
      </Popover>
    )
  return (
    <Popover
      label={`Signed in as ${user.name}. Account menu`}
      button={() => (
        <span className="grid size-10 place-items-center rounded-full bg-lime text-sm font-extrabold text-note ring-2 ring-white/20 transition-transform hover:scale-105">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    >
      {(close) => (
        <>
          <div className="px-3 py-2">
            <p className="font-semibold text-ink">{user.name}</p>
            <p className="text-sm text-muted">@{user.username}</p>
            <p className="mt-1 text-xs text-muted">Logging out takes you back to the no-account space on this device.</p>
          </div>
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" onClick={() => { close(); onLogout() }} className={item}>
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (window.confirm('Delete your account and everything it saved on this device? This can’t be undone.')) {
                close()
                onDeleteAccount()
              }
            }}
            className={`${item} text-critical hover:bg-[#fde8e6]`}
          >
            <UserX className="size-4" aria-hidden /> Delete my account
          </button>
        </>
      )}
    </Popover>
  )
}
