// ── ID generator ──────────────────────────────────────────────
export function uid(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

// ── Formatting ────────────────────────────────────────────────
export function money(n) {
  if (!n && n !== 0) return '—'
  return 'GH₵' + Number(n).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function ts() {
  return today() + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning 🌅'
  if (h < 17) return 'Good afternoon ☀️'
  if (h < 21) return 'Good evening 🌇'
  return 'Good night 🌙'
}

// ── Badge variant ─────────────────────────────────────────────
export function statusVariant(s) {
  return {
    Delivered: 'success', Processing: 'info', 'In Transit': 'info',
    'Awaiting Ops Review': 'ops', Cancelled: 'danger',
    Paid: 'success', Unpaid: 'danger', Partial: 'warning', Overdue: 'danger',
    Active: 'success', Draft: 'neutral', Completed: 'info', Paused: 'warning',
    OK: 'success', Low: 'warning', Critical: 'danger', Out: 'danger',
    Scheduled: 'neutral', Loaded: 'warning', 'En Route': 'info', Failed: 'danger',
  }[s] || 'neutral'
}

// ── Owed balance ──────────────────────────────────────────────
export function owedBalance(name, invoices) {
  if (!name) return 0
  const n = name.trim().toLowerCase()
  return invoices
    .filter(i => i.customer && i.customer.trim().toLowerCase() === n && i.status !== 'Paid')
    .reduce((s, i) => s + Math.max(0, Number(i.amount || 0) - Number(i.amountPaid || 0)), 0)
}

// ── Customer exists ───────────────────────────────────────────
export function customerExists(name, customers) {
  if (!name) return false
  return customers.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())
}

// ── EaziGas formulas ──────────────────────────────────────────
export function calcEpClosing(r) {
  const ob = Number(r?.ob || 0), oe = Number(r?.oe || 0)
  const ts = Number(r?.ts || 0), fr = Number(r?.fr || 0)
  const er = Number(r?.er || 0), ed = Number(r?.ed || 0)
  return {
    cf: Math.max(0, ob - ts + fr),
    ce: Math.max(0, oe + er - ed),
  }
}

// ── Holding area formulas ─────────────────────────────────────
export function calcHoldingClosing(r) {
  return {
    cf: Math.max(0, Number(r?.of || 0) + Number(r?.rf || 0) - Number(r?.df || 0)),
    ce: Math.max(0, Number(r?.oe || 0) + Number(r?.re || 0) - Number(r?.de || 0)),
  }
}

// ── Winneba CDO formulas ──────────────────────────────────────
export function calcWcdClosing(r) {
  return {
    cf: Math.max(0, Number(r?.of || 0) + Number(r?.rf || 0) - Number(r?.sf || 0)),
    ce: Math.max(0, Number(r?.oe || 0) + Number(r?.re || 0) - Number(r?.de || 0)),
  }
}

// ── Doc expiry status ─────────────────────────────────────────
export function docStatus(expiry) {
  if (!expiry) return 'none'
  const diff = (new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'expired'
  if (diff <= 30) return 'critical'
  if (diff <= 90) return 'warning'
  return 'ok'
}

// ── Rep colors ────────────────────────────────────────────────
export const REPS = ['Joseph', 'Tima', 'Abigail']
export const REP_COLORS = { Joseph: '#0057FF', Tima: '#7C3AED', Abigail: '#1A9E6B' }

export const EAZIGAS_CYLS = ['14.5kg', '13kg', '6kg']
export const HOLDING_CYLS = ['50kg','14.5kg','6kg','13kg','20kg','20kg fibre','25kg fibre','3kg']
export const WINNEBA_CYLS = ['14.5KG','13KG','6KG']

export const LOGO_URL = 'https://i0.wp.com/henosenergy.com/wp/wp-content/uploads/2023/10/Henos-Logo-White1.png?fit=1000%2C416&ssl=1'
