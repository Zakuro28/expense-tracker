import { AnimatePresence, motion } from 'motion/react'
import { moneyWhole } from '../lib/data'

export type Flight = { id: number; amount: number; from: { x: number; y: number }; to: { x: number; y: number } }

// A lime coin that arcs from the form's button into the monthly total
export default function CoinFlight({ flight, onLand }: { flight: Flight | null; onLand: () => void }) {
  return (
    <AnimatePresence>
      {flight && (
        <motion.div
          key={flight.id}
          className="pointer-events-none fixed top-0 left-0 z-[70]"
          initial={{ x: flight.from.x, y: flight.from.y, scale: 0.4, opacity: 0 }}
          animate={{
            x: [flight.from.x, (flight.from.x + flight.to.x) / 2, flight.to.x],
            // Rise above both points, then drop in
            y: [flight.from.y, Math.min(flight.from.y, flight.to.y) - 140, flight.to.y],
            scale: [0.4, 1.15, 0.5],
            opacity: [0, 1, 1],
            rotate: [0, -12, 8],
          }}
          exit={{ opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.85, ease: [0.45, 0, 0.25, 1], times: [0, 0.45, 1] }}
          onAnimationComplete={onLand}
        >
          <div className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-lime px-4 py-2 text-lg font-extrabold whitespace-nowrap text-note shadow-[0_10px_40px_rgba(201,242,107,0.6)] ring-4 ring-lime/30">
            +{moneyWhole(flight.amount)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
