import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, requireModule('commercial'))

router.get('/', async (req, res) => {
  try {
    res.json(await prisma.b2BOrder.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { customerId, ...rest } = req.body || {}
    res.status(201).json(await prisma.b2BOrder.create({
      data: {
        ...rest,
        volume: rest.volume !== undefined && rest.volume !== null ? Number(rest.volume) : null,
        price: rest.price !== undefined && rest.price !== null ? Number(rest.price) : null,
        volumeInTransit: rest.volumeInTransit !== undefined && rest.volumeInTransit !== null ? Number(rest.volumeInTransit) : null,
        ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
      },
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const payload = { ...req.body }
    if ('volume' in payload) payload.volume = payload.volume !== null ? Number(payload.volume) : null
    if ('price' in payload) payload.price = payload.price !== null ? Number(payload.price) : null
    if ('volumeInTransit' in payload) payload.volumeInTransit = payload.volumeInTransit !== null ? Number(payload.volumeInTransit) : null
    delete payload.customer
    res.json(await prisma.b2BOrder.update({ where: { id: req.params.id }, data: payload }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.b2BOrder.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
