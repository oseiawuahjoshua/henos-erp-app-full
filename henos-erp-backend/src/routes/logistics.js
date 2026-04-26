import express from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

const DISTANCE_RATE_TABLE = {
  66: 0.23,
  98: 0.33,
  118: 0.4,
  159: 0.53,
  285: 0.82,
  299: 0.86,
  308: 0.87,
}

function requireLogisticsAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' })
  const modules = req.user.modules || []
  const allowed =
    req.user.role === 'admin' ||
    modules.includes('logistics') ||
    modules.includes('operations')

  if (!allowed) {
    return res.status(403).json({ error: 'Access to logistics denied.' })
  }
  next()
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toNumberOrZero(value) {
  if (value === '' || value === null || value === undefined) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeVehicle(body = {}) {
  return {
    brvNumber: String(body.brvNumber || '').trim().toUpperCase(),
    name: body.name ? String(body.name).trim().toUpperCase() : null,
    type: body.type ? String(body.type).trim() : null,
    capacityKg: toNumberOrNull(body.capacityKg),
    driver: body.driver ? String(body.driver).trim().toUpperCase() : null,
    status: body.status || 'Active',
    notes: body.notes ? String(body.notes).trim() : null,
  }
}

function normalizeLoading(body = {}) {
  const productWeight = toNumberOrZero(body.productWeight)
  const distance = toNumberOrNull(body.distance)
  const rate = toNumberOrZero(body.rate) || DISTANCE_RATE_TABLE[Math.round(distance || 0)] || 0
  const fuel = toNumberOrZero(body.fuel)
  const roadExpenses = toNumberOrZero(body.roadExpenses)
  const amountPayable = Number((productWeight * rate * 0.925).toFixed(2))
  const productExpensePercent = amountPayable > 0
    ? Number((((fuel + roadExpenses) / amountPayable) * 100).toFixed(2))
    : 0

  return {
    date: body.date,
    period: body.period ? String(body.period).trim() : null,
    driver: body.driver ? String(body.driver).trim().toUpperCase() : null,
    productWeight,
    location: body.location ? String(body.location).trim().toUpperCase() : null,
    distance,
    rate,
    amountPayable,
    fuel: toNumberOrNull(body.fuel),
    roadExpenses: toNumberOrNull(body.roadExpenses),
    productExpensePercent,
    omc: body.omc ? String(body.omc).trim().toUpperCase() : null,
  }
}

function normalizeMaintenance(body = {}) {
  return {
    date: body.date,
    period: body.period ? String(body.period).trim() : null,
    description: String(body.description || '').trim(),
    amount: toNumberOrZero(body.amount),
    vendor: body.vendor ? String(body.vendor).trim().toUpperCase() : null,
    notes: body.notes ? String(body.notes).trim() : null,
  }
}

router.get('/vehicles', requireLogisticsAccess, async (req, res) => {
  try {
    const vehicles = await prisma.logisticsVehicle.findMany({
      include: {
        loadings: { orderBy: { date: 'desc' } },
        maintenance: { orderBy: { date: 'desc' } },
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json(vehicles)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/vehicles', requireLogisticsAccess, async (req, res) => {
  try {
    res.status(201).json(await prisma.logisticsVehicle.create({ data: normalizeVehicle(req.body) }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/vehicles/:id', requireLogisticsAccess, async (req, res) => {
  try {
    res.json(await prisma.logisticsVehicle.update({
      where: { id: req.params.id },
      data: normalizeVehicle(req.body),
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/vehicles/:id', requireLogisticsAccess, async (req, res) => {
  try {
    await prisma.logisticsVehicle.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/loadings', requireLogisticsAccess, async (req, res) => {
  try {
    const { vehicleId, ...rest } = req.body || {}
    res.status(201).json(await prisma.logisticsLoading.create({
      data: {
        ...normalizeLoading(rest),
        vehicle: { connect: { id: vehicleId } },
      },
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/loadings/:id', requireLogisticsAccess, async (req, res) => {
  try {
    const { vehicleId, ...rest } = req.body || {}
    const data = normalizeLoading(rest)
    if (vehicleId) data.vehicle = { connect: { id: vehicleId } }
    res.json(await prisma.logisticsLoading.update({
      where: { id: req.params.id },
      data,
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/loadings/:id', requireLogisticsAccess, async (req, res) => {
  try {
    await prisma.logisticsLoading.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/maintenance', requireLogisticsAccess, async (req, res) => {
  try {
    const { vehicleId, ...rest } = req.body || {}
    res.status(201).json(await prisma.logisticsMaintenance.create({
      data: {
        ...normalizeMaintenance(rest),
        vehicle: { connect: { id: vehicleId } },
      },
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/maintenance/:id', requireLogisticsAccess, async (req, res) => {
  try {
    const { vehicleId, ...rest } = req.body || {}
    const data = normalizeMaintenance(rest)
    if (vehicleId) data.vehicle = { connect: { id: vehicleId } }
    res.json(await prisma.logisticsMaintenance.update({
      where: { id: req.params.id },
      data,
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/maintenance/:id', requireLogisticsAccess, async (req, res) => {
  try {
    await prisma.logisticsMaintenance.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
