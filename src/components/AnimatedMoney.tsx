import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { money, moneyWhole } from '../lib/data'

// Counts up from zero when it first appears, then rolls between values
export default function AnimatedMoney({ value, whole = false, className, duration = 1.2 }: { value: number; whole?: boolean; className?: string; duration?: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => (whole ? moneyWhole(v) : money(v)))

  useEffect(() => {
    const c = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] })
    return () => c.stop()
  }, [mv, value, duration])

  return <motion.span className={className}>{text}</motion.span>
}
