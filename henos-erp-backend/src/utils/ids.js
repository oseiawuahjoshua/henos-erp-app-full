function compactName(name = '') {
  const cleaned = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .trim()

  if (!cleaned) return 'GEN'

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 4)

  const initials = parts.slice(0, 3).map(part => part[0]).join('')
  return initials.slice(0, 4) || cleaned.replace(/\s+/g, '').slice(0, 4)
}

function randomDigits(length = 4) {
  return Math.floor(Math.random() * (10 ** length)).toString().padStart(length, '0')
}

export function makeBusinessId(type, name) {
  const typeCode = {
    customer: 'CU',
    order: 'OR',
    invoice: 'IV',
  }[type] || 'ID'

  return `HN-${typeCode}-${compactName(name)}-${randomDigits(4)}`
}
