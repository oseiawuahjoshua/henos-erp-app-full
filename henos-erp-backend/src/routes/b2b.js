import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, requireModule('commercial'))

router.get('/', async (req, res) => {
  try {
    res.json(await prisma.b2BOrder.findMany({
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { customerId, ...rest } = req.body || {}
    const customerName = String(rest.customerName || '').trim().toUpperCase()
    const volume = rest.volume !== undefined && rest.volume !== null ? Number(rest.volume) : null
    const price = rest.price !== undefined && rest.price !== null ? Number(rest.price) : null
    const volumeInTransit = rest.volumeInTransit !== undefined && rest.volumeInTransit !== null ? Number(rest.volumeInTransit) : null
    const totalCost = volume !== null && price !== null ? Number((volume * price).toFixed(2)) : null

    const customer = customerId
      ? await prisma.customer.findUnique({ where: { id: customerId } })
      : await prisma.customer.findFirst({ where: { name: customerName } })

    const result = await prisma.$transaction(async tx => {
      const entry = await tx.b2BOrder.create({
        data: {
          ...rest,
          customerName,
          volume,
          price,
          totalCost,
          volumeInTransit,
          ...(customer ? { customer: { connect: { id: customer.id } } } : {}),
        },
        include: { customer: { select: { id: true, name: true } } },
      })

      let invoice = null
      if (customer && totalCost !== null) {
        invoice = await tx.invoice.create({
          data: {
            amount: totalCost,
            amountPaid: 0,
            status: 'Unpaid',
            deliveryDate: rest.date || null,
            dueDate: rest.date || null,
            source: 'B2B',
            repName: customer.rep || null,
            date: rest.date || null,
            customer: { connect: { id: customer.id } },
            items: {
              create: [{
                type: 'B2B LPG',
                qty: volume || 0,
                price: price || 0,
                bulkDesc: `${rest.depot || 'B2B'} / ${rest.vehicleNumber || 'Transit'}`,
                isBulk: true,
              }],
            },
          },
          include: { customer: { select: { id: true, name: true } }, items: true, payments: true },
        })
      }

      return { entry, invoice }
    })

    res.status(201).json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const payload = { ...req.body }
    if ('customerName' in payload) payload.customerName = String(payload.customerName || '').trim().toUpperCase()
    const current = await prisma.b2BOrder.findUnique({ where: { id: req.params.id } })
    if ('volume' in payload) payload.volume = payload.volume !== null ? Number(payload.volume) : null
    if ('price' in payload) payload.price = payload.price !== null ? Number(payload.price) : null
    if ('volume' in payload || 'price' in payload) {
      const volume = 'volume' in payload ? payload.volume : current?.volume
      const price = 'price' in payload ? payload.price : current?.price
      payload.totalCost = volume !== null && volume !== undefined && price !== null && price !== undefined
        ? Number((volume * price).toFixed(2))
        : null
    }
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
