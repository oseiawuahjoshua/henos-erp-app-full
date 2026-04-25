export function uid(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

export function money(n) {
  if (!n && n !== 0) return '-'
  return 'GHs ' + Number(n).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function ts() {
  return `${today()} ${new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())}`
}

export function getAccraNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Accra' }))
}

export function formatAccraDate(options = {}, value = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    ...options,
  }).format(new Date(value))
}

export function greet() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    hour: '2-digit',
    hour12: false,
  }).format(new Date()))

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

export function statusVariant(s) {
  return {
    Delivered: 'success',
    Processing: 'info',
    'In Transit': 'info',
    'Awaiting Ops Review': 'ops',
    Cancelled: 'danger',
    Paid: 'success',
    Unpaid: 'danger',
    Partial: 'warning',
    Overdue: 'danger',
    Active: 'success',
    Draft: 'neutral',
    Completed: 'info',
    Paused: 'warning',
    OK: 'success',
    Low: 'warning',
    Critical: 'danger',
    Out: 'danger',
    Scheduled: 'neutral',
    Loaded: 'warning',
    'En Route': 'info',
    Failed: 'danger',
  }[s] || 'neutral'
}

export function owedBalance(name, invoices) {
  if (!name) return 0
  const normalized = name.trim().toLowerCase()
  return invoices
    .filter(invoice => invoice.customer && invoice.customer.trim().toLowerCase() === normalized && invoice.status !== 'Paid')
    .reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0)), 0)
}

export function customerExists(name, customers) {
  if (!name) return false
  return customers.some(customer => customer.name.trim().toLowerCase() === name.trim().toLowerCase())
}

export function calcEpClosing(row) {
  const ob = Number(row?.ob || 0)
  const oe = Number(row?.oe || 0)
  const tsValue = Number(row?.ts || 0)
  const fr = Number(row?.fr || 0)
  const er = Number(row?.er || 0)
  const ed = Number(row?.ed || 0)
  return {
    cf: Math.max(0, ob - tsValue + fr),
    ce: Math.max(0, oe + er - ed),
  }
}

export function calcHoldingClosing(row) {
  return {
    cf: Math.max(0, Number(row?.of || 0) + Number(row?.rf || 0) - Number(row?.df || 0)),
    ce: Math.max(0, Number(row?.oe || 0) + Number(row?.re || 0) - Number(row?.de || 0)),
  }
}

export function calcWcdClosing(row) {
  return {
    cf: Math.max(0, Number(row?.of || 0) + Number(row?.rf || 0) - Number(row?.sf || 0)),
    ce: Math.max(0, Number(row?.oe || 0) + Number(row?.re || 0) - Number(row?.de || 0)),
  }
}

export function docStatus(expiry) {
  if (!expiry) return 'none'
  const diff = (new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'expired'
  if (diff <= 30) return 'critical'
  if (diff <= 90) return 'warning'
  return 'ok'
}

export const REPS = ['Joseph', 'Tima', 'Abigail']
export const REP_COLORS = { Joseph: '#0057FF', Tima: '#7C3AED', Abigail: '#1A9E6B' }

export const EAZIGAS_CYLS = ['14.5kg', '13kg', '6kg']
export const HOLDING_CYLS = ['50kg', '14.5kg', '6kg', '13kg', '20kg', '20kg fibre', '25kg fibre', '3kg']
export const WINNEBA_CYLS = ['14.5KG', '13KG', '6KG']

export const LOGO_URL = 'https://i0.wp.com/henosenergy.com/wp/wp-content/uploads/2023/10/Henos-Logo-White1.png?fit=1000%2C416&ssl=1'
