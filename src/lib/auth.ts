// Optional sign-in for people sharing one device. Without an account, entries go into a
// shared guest space. Everything stays in this browser: there is no server, so data
// doesn't follow someone to a new phone or PC.
import { load, loadBooks, save, setStorageUser, uid } from './data'

export type User = { id: string; name: string; username: string; salt: string; hash: string; createdAt: number }
export type PublicUser = Pick<User, 'id' | 'name' | 'username'>

const USERS = 'pitaka:users'
const SESSION = 'pitaka:session'

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

// Passwords are never stored; only a salted SHA-256 hash, stretched a little
async function hashPassword(password: string, salt: string) {
  let data = new TextEncoder().encode(`${salt}:${password}`)
  let out: ArrayBuffer = new ArrayBuffer(0)
  for (let i = 0; i < 5000; i++) {
    out = await crypto.subtle.digest('SHA-256', data)
    data = new Uint8Array(out)
  }
  return toHex(out)
}

const users = () => load<User[]>(USERS, [])
const strip = (u: User): PublicUser => ({ id: u.id, name: u.name, username: u.username })
const normalize = (s: string) => s.trim().toLowerCase()

export const listUsers = () => users().map(strip)

export function currentUser(): PublicUser | null {
  const id = load<string | null>(SESSION, null)
  const u = users().find((x) => x.id === id)
  return u ? strip(u) : null
}

export async function signUp(name: string, username: string, password: string): Promise<{ user?: PublicUser; error?: string; first: boolean }> {
  const all = users()
  const uname = normalize(username)
  if (!name.trim()) return { error: 'Enter your name.', first: false }
  if (!/^[a-z0-9._-]{3,20}$/.test(uname)) return { error: 'Usernames are 3 to 20 letters, numbers, dots, dashes or underscores.', first: false }
  if (all.some((u) => u.username === uname)) return { error: 'That username is taken on this device. Try another, or sign in.', first: false }
  if (password.length < 6) return { error: 'Use at least 6 characters for your password.', first: false }

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const user: User = { id: uid(), name: name.trim(), username: uname, salt, hash: await hashPassword(password, salt), createdAt: Date.now() }
  save(USERS, [...all, user])
  save(SESSION, user.id)
  return { user: strip(user), first: all.length === 0 }
}

export async function signIn(username: string, password: string): Promise<{ user?: PublicUser; error?: string }> {
  const u = users().find((x) => x.username === normalize(username))
  if (!u) return { error: 'No account with that username on this device. Check the spelling or create an account.' }
  if ((await hashPassword(password, u.salt)) !== u.hash) return { error: 'That password doesn’t match. Try again.' }
  save(SESSION, u.id)
  return { user: strip(u) }
}

export function signOut() {
  save(SESSION, null)
}

/* ---------- Guest space: used by anyone who hasn't signed in ---------- */

export const GUEST_ID = 'guest'
const GUEST_PREFIX = `pitaka:u:${GUEST_ID}:`

const storageKeys = () => {
  try {
    return Object.keys(localStorage)
  } catch {
    return []
  }
}

/**
 * Opens the guest space. The very first visit on a device fills it with sample data
 * (or anything saved by the older, account-free version) so there's something to look at.
 */
export function enterGuest() {
  setStorageUser(GUEST_ID)
  if (load(SEEDED, false)) return
  loadBooks({ withSample: true, adoptLegacy: true })
  save(SEEDED, true)
}
const SEEDED = 'pitaka:guest-seeded'

/** True when the guest space holds at least one entry, bill, goal or wish */
export function guestHasData() {
  return storageKeys().some((k) => /:(tx|bills|goals|wish):/.test(k) && k.startsWith(GUEST_PREFIX) && load<unknown[]>(k, []).length > 0)
}

/** Moves everything saved as a guest into an account; the guest space starts fresh afterwards */
export function moveGuestDataTo(userId: string) {
  try {
    for (const k of storageKeys().filter((k) => k.startsWith(GUEST_PREFIX))) {
      const v = localStorage.getItem(k)
      if (v !== null) localStorage.setItem(`pitaka:u:${userId}:${k.slice(GUEST_PREFIX.length)}`, v)
      localStorage.removeItem(k)
    }
  } catch {
    /* storage unavailable */
  }
}

/** Removes the account and everything it saved on this device */
export function deleteAccount(userId: string) {
  save(USERS, users().filter((u) => u.id !== userId))
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(`pitaka:u:${userId}:`))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* storage unavailable */
  }
  signOut()
}
