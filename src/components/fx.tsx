// Small interaction helpers: a light that follows the mouse, springy presses,
// icons that draw themselves, and a magnetic pull for the main button.
import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useSpring } from 'motion/react'

const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Page-wide touches, set up once:
 * - a soft glow behind everything that drifts toward the mouse
 * - a light on whichever card the mouse is over
 * - every button squishes and springs back when pressed
 */
export function Interactions() {
  const glow = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return
    let lit: HTMLElement | null = null
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      glow.current?.style.setProperty('--gx', `${e.clientX}px`)
      glow.current?.style.setProperty('--gy', `${e.clientY}px`)
      const card = e.target instanceof Element ? e.target.closest<HTMLElement>('.card') : null
      if (lit && lit !== card) lit.style.setProperty('--spot', '0')
      if (card) {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--sx', `${e.clientX - r.left}px`)
        card.style.setProperty('--sy', `${e.clientY - r.top}px`)
        card.style.setProperty('--spot', '1')
      }
      lit = card
    }
    const press = (e: PointerEvent) => {
      const b = e.target instanceof Element ? e.target.closest<HTMLElement>('button:not(:disabled), [role="tab"], [role="radio"]') : null
      if (!b || b.dataset.noPress !== undefined) return
      b.animate([{ scale: 1 }, { scale: 0.93 }, { scale: 1.03 }, { scale: 1 }], { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' })
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', press, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', press)
    }
  }, [reduce])

  return <div ref={glow} className="ambient-glow" aria-hidden />
}

/** Wraps a Lucide icon so its lines draw in, and redraw on hover or when `replay` changes */
export function DrawIcon({ children, replay }: { children: ReactNode; replay?: unknown }) {
  const ref = useRef<HTMLSpanElement>(null)
  const redraw = () => {
    const el = ref.current
    if (!el) return
    el.classList.remove('is-drawn')
    void el.offsetWidth
    el.classList.add('is-drawn')
  }
  useEffect(() => {
    ref.current?.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse').forEach((p) => p.setAttribute('pathLength', '1'))
    redraw()
  }, [replay])
  return (
    <span ref={ref} className="draw-icon" onPointerEnter={redraw}>
      {children}
    </span>
  )
}

/** Leans toward the mouse while it's nearby, then springs back */
export function Magnetic({ children, className = '', strength = 0.3 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 220, damping: 15 })
  const y = useSpring(0, { stiffness: 220, damping: 15 })
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className={className}
      onPointerMove={(e) => {
        if (!fine() || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
