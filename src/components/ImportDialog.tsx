import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import type { ImportResult } from '../lib/excel'

// Loaded on demand; the Excel library is large
const importFromFile = async (f: File) => (await import('../lib/excel')).importFromFile(f)
const downloadTemplate = async () => (await import('../lib/excel')).downloadTemplate()
import { money } from '../lib/data'

type Props = { open: boolean; bookName: string; onClose: () => void; onImport: (r: ImportResult) => void }

export default function ImportDialog({ open, bookName, onClose, onImport }: Props) {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setResult(null)
    setFileName('')
    setError('')
  }

  const read = async (file: File) => {
    setBusy(true)
    setError('')
    setFileName(file.name)
    try {
      const r = await importFromFile(file)
      setResult(r)
      if (r.rows.length === 0) setError('No entries could be read. Check that the first sheet has Date, Type, Category, Account, Note and Amount columns.')
    } catch {
      setError('That file couldn’t be opened. Use an .xlsx, .xls or .csv file.')
      setResult(null)
    }
    setBusy(false)
  }

  const inflow = result?.rows.filter((r) => r.type === 'in').reduce((s, r) => s + r.amount, 0) ?? 0
  const outflow = result?.rows.filter((r) => r.type === 'out').reduce((s, r) => s + r.amount, 0) ?? 0

  return (
    <AnimatePresence onExitComplete={reset}>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-note-deep/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="card w-full max-w-lg p-6 sm:p-7"
          >
            <div className="flex items-center justify-between">
              <h2 id="import-title" className="text-lg font-bold">
                Import into “{bookName}”
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full text-muted hover:bg-wash">
                <X className="size-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                const f = e.dataTransfer.files[0]
                if (f) read(f)
              }}
              className={`mt-5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${drag ? 'border-leaf bg-leaf/5' : 'border-line hover:border-leaf hover:bg-wash'}`}
            >
              {busy ? <Loader2 className="size-8 animate-spin text-leaf" /> : <Upload className="size-8 text-leaf" />}
              <span className="font-semibold">{fileName || 'Choose a file or drop it here'}</span>
              <span className="text-sm text-muted">Excel (.xlsx, .xls) or CSV</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) read(f)
                e.target.value = ''
              }}
            />

            <p className="mt-3 text-sm text-muted">
              Columns: Date, Type (Money in / Money out / Savings), Category, Account, Note, Amount.{' '}
              <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1 font-semibold text-leaf underline underline-offset-2">
                <FileSpreadsheet className="size-3.5" /> Download a template
              </button>
            </p>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl bg-[#fde8e6] px-3 py-2 text-sm font-medium text-critical">
                  {error}
                </motion.p>
              )}
              {result && result.rows.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 overflow-hidden rounded-2xl bg-wash p-4 text-sm">
                  <p className="font-semibold">Ready to import {result.rows.length} entries</p>
                  <p className="mt-1 text-muted">
                    {money(inflow)} money in, {money(outflow)} money out.
                  </p>
                  {result.skipped.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[#8a5d00]">{result.skipped.length} rows will be skipped</summary>
                      <ul className="mt-1 max-h-28 overflow-auto text-muted">
                        {result.skipped.map((s) => (
                          <li key={s.row}>
                            Row {s.row}: {s.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              disabled={!result || result.rows.length === 0}
              onClick={() => result && onImport(result)}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-white transition-opacity disabled:opacity-40"
            >
              <Upload className="size-4.5 text-lime" /> {result?.rows.length ? `Import ${result.rows.length} entries` : 'Import'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
