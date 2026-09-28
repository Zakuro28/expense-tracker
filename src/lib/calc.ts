// A tiny, safe arithmetic evaluator: numbers, + − × ÷ %, and parentheses. No eval().

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'paren'; v: '(' | ')' }

function tokenize(src: string): Tok[] | null {
  const s = src.replace(/[×x*]/g, '*').replace(/[÷/]/g, '/').replace(/[−–]/g, '-').replace(/,/g, '').replace(/\s+/g, '')
  const out: Tok[] = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/[\d.]/.test(c)) {
      let j = i
      while (j < s.length && /[\d.]/.test(s[j])) j++
      const n = Number(s.slice(i, j))
      if (!Number.isFinite(n)) return null
      out.push({ t: 'num', v: n })
      i = j
    } else if ('+-*/%'.includes(c)) {
      out.push({ t: 'op', v: c })
      i++
    } else if (c === '(' || c === ')') {
      out.push({ t: 'paren', v: c })
      i++
    } else return null
  }
  return out
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 3, neg: 4 }

/** Returns the result, or null if the expression is incomplete or invalid */
export function evaluate(src: string): number | null {
  const toks = tokenize(src)
  if (!toks || toks.length === 0) return null

  // Shunting-yard to postfix
  const output: (number | string)[] = []
  const ops: string[] = []
  let prev: Tok | null = null
  for (const tok of toks) {
    if (tok.t === 'num') output.push(tok.v)
    else if (tok.t === 'op') {
      // Leading minus or after another operator / "(" means negative
      if (tok.v === '-' && (!prev || prev.t === 'op' || (prev.t === 'paren' && prev.v === '('))) {
        ops.push('neg')
      } else if (tok.v === '%') {
        output.push('%') // postfix percent: divide the previous number by 100
      } else {
        while (ops.length && ops[ops.length - 1] !== '(' && PREC[ops[ops.length - 1]] >= PREC[tok.v]) output.push(ops.pop()!)
        ops.push(tok.v)
      }
    } else if (tok.v === '(') ops.push('(')
    else {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop()!)
      if (!ops.length) return null
      ops.pop()
    }
    prev = tok
  }
  while (ops.length) {
    const op = ops.pop()!
    if (op === '(') return null
    output.push(op)
  }

  const st: number[] = []
  for (const x of output) {
    if (typeof x === 'number') st.push(x)
    else if (x === 'neg' || x === '%') {
      const a = st.pop()
      if (a === undefined) return null
      st.push(x === 'neg' ? -a : a / 100)
    } else {
      const b = st.pop()
      const a = st.pop()
      if (a === undefined || b === undefined) return null
      st.push(x === '+' ? a + b : x === '-' ? a - b : x === '*' ? a * b : b === 0 ? NaN : a / b)
    }
  }
  if (st.length !== 1 || !Number.isFinite(st[0])) return null
  return Math.round(st[0] * 100) / 100
}

export const isExpression = (s: string) => /[+\-×x*÷/%()−]/.test(s.replace(/^-/, ''))
