import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, LogIn, UserPlus } from 'lucide-react'
import { listUsers, signIn, signUp, type PublicUser } from '../lib/auth'

type Props = {
  initialMode: 'in' | 'up'
  canBringGuestData: boolean
  onBack: () => void
  onAuthed: (u: PublicUser, opts: { isNew: boolean; withSample: boolean; bringGuestData: boolean }) => void
}

export default function AuthScreen({ initialMode, canBringGuestData, onBack, onAuthed }: Props) {
  const existing = listUsers()
  const [mode, setMode] = useState<'in' | 'up'>(initialMode)
  const [name, setName] = useState('')
  const [username, setUsername] = useState(existing.length === 1 ? existing[0].username : '')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [withSample, setWithSample] = useState(false)
  const [bring, setBring] = useState(canBringGuestData)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    if (mode === 'in') {
      const r = await signIn(username, password)
      setBusy(false)
      if (r.error || !r.user) return setError(r.error ?? 'Something went wrong. Try again.')
      onAuthed(r.user, { isNew: false, withSample: false, bringGuestData: false })
    } else {
      const r = await signUp(name, username, password)
      setBusy(false)
      if (r.error || !r.user) return setError(r.error ?? 'Something went wrong. Try again.')
      onAuthed(r.user, { isNew: true, withSample, bringGuestData: canBringGuestData && bring })
    }
  }

  const field = 'mt-1 h-12 w-full rounded-xl border border-line bg-wash px-4 text-ink outline-none transition-colors focus:border-leaf focus:bg-white'

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-md">
        <button type="button" onClick={onBack} className="group mb-6 flex items-center gap-2 rounded-full py-2 pr-4 pl-3 text-sm font-semibold text-cream/80 ring-1 ring-white/15 transition-colors hover:bg-white/10 hover:text-white">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          Continue without an account
        </button>
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.svg viewBox="0 0 64 64" className="size-16" initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.2 }} aria-hidden>
            <rect width="64" height="64" rx="18" fill="#155240" />
            <rect x="12" y="20" width="40" height="28" rx="7" fill="#c9f26b" />
            <path d="M12 27h40" stroke="#0c3a2b" strokeWidth="3" />
            <rect x="36" y="32" width="16" height="10" rx="5" fill="#0c3a2b" />
            <circle cx="42" cy="37" r="2.2" fill="#c9f26b" />
          </motion.svg>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">Pitaka</h1>
          <p className="mt-1 max-w-sm text-cream/70">An account is optional. It gives you a private space when other people use this device too.</p>
        </div>

        <form
          className="card p-6 sm:p-8"
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy) submit()
          }}
        >
          <div role="tablist" className="relative grid grid-cols-2 rounded-2xl bg-wash p-1">
            {(['in', 'up'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`relative z-10 rounded-xl py-2.5 text-sm font-semibold transition-colors ${mode === m ? 'text-white' : 'text-ink-soft'}`}
              >
                {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 -z-10 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                {m === 'in' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {mode === 'in' && existing.length > 0 && (
            <div className="mt-5">
              <p className="text-sm text-muted">Accounts on this device</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {existing.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUsername(u.username)}
                    className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors ${username === u.username ? 'border-ink bg-ink text-white' : 'border-line hover:bg-wash'}`}
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-lime text-xs font-bold text-note">{u.name.slice(0, 1).toUpperCase()}</span>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {mode === 'up' && (
              <motion.label key="name" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="block overflow-hidden">
                <span className="mt-5 block text-sm text-muted">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} placeholder="Juan" />
              </motion.label>
            )}
          </AnimatePresence>

          <label className="mt-4 block">
            <span className="text-sm text-muted">Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" className={field} placeholder="juan.dc" />
          </label>

          <label className="mt-4 block">
            <span className="text-sm text-muted">Password</span>
            <span className="relative block">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                className={`${field} pr-12`}
                placeholder={mode === 'up' ? 'At least 6 characters' : ''}
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-2 mt-0.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-line">
                {show ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
              </button>
            </span>
          </label>

          {mode === 'up' && canBringGuestData && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
              <input type="checkbox" checked={bring} onChange={(e) => setBring(e.target.checked)} className="mt-0.5 size-4.5 shrink-0 accent-[#1f7a4f]" />
              Move what I added without an account into this account
            </label>
          )}
          {mode === 'up' && !(canBringGuestData && bring) && (
            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
              <input type="checkbox" checked={withSample} onChange={(e) => setWithSample(e.target.checked)} className="size-4.5 accent-[#1f7a4f]" />
              Start with sample data so I can look around
            </label>
          )}

          <AnimatePresence>
            {error && (
              <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }} exit={{ opacity: 0 }} className="mt-4 rounded-xl bg-[#fde8e6] px-3 py-2 text-sm font-medium text-critical">
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={busy} whileTap={{ scale: 0.97 }} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-white transition-colors hover:bg-note-soft disabled:opacity-70">
            {busy ? <Loader2 className="size-5 animate-spin" /> : mode === 'in' ? <LogIn className="size-5 text-lime" /> : <UserPlus className="size-5 text-lime" />}
            {mode === 'in' ? 'Sign in' : 'Create account'}
          </motion.button>

          <p className="mt-5 flex items-start gap-2 text-xs text-muted">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            You stay signed in on this device until you log out. Your entries are saved in this browser only, so they won’t appear on another phone or computer.
          </p>
        </form>
      </motion.div>
    </div>
  )
}
