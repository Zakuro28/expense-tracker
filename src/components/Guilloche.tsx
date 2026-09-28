import { useEffect, useMemo } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

// The engraved rosette pattern printed on banknotes: overlapping hypotrochoid curves
function rosette(R: number, r: number, d: number, turns: number, cx: number, cy: number) {
  const steps = 1400
  let path = ''
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)
    path += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return path
}

// Parallel wavy bands, like the border lines on a note
function waves(count: number, width: number, y0: number) {
  return Array.from({ length: count }, (_, k) => {
    let p = ''
    for (let x = 0; x <= width; x += 8) {
      const y = y0 + k * 7 + Math.sin(x / 60 + k * 0.35) * 18 + Math.sin(x / 23 + k) * 4
      p += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`
    }
    return p
  })
}

export default function Guilloche() {
  // Drifts gently against the pointer for a sense of depth
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 30, damping: 20 })
  const y = useSpring(my, { stiffness: 30, damping: 20 })
  useEffect(() => {
    if (reduce) return
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * -40)
      my.set((e.clientY / window.innerHeight - 0.5) * -30)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my, reduce])

  const { rings, bands } = useMemo(
    () => ({
      rings: [rosette(300, 105, 150, 7, 400, 400), rosette(260, 70, 120, 14, 400, 400), rosette(200, 55, 90, 11, 400, 400)],
      bands: waves(14, 1600, 40),
    }),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <motion.div style={{ x, y }} className="absolute -top-[22vmax] -right-[18vmax] size-[70vmax]">
        <motion.svg
          viewBox="0 0 800 800"
          className="guilloche size-full"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.16, scale: 1 }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {rings.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke={i === 1 ? '#c9f26b' : '#eef5ec'}
              strokeWidth={0.6}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, delay: i * 0.3, ease: 'easeInOut' }}
            />
          ))}
        </motion.svg>
      </motion.div>
      <svg viewBox="0 0 1600 160" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-40 w-full opacity-[0.1]">
        {bands.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#eef5ec" strokeWidth={0.7} />
        ))}
      </svg>
    </div>
  )
}
