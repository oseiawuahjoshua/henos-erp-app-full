import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'
const router = express.Router()
router.use(requireAuth, requireModule('accounts'))

function sanitizeInvoicePayload(body = {}) {
  const next = { ...body }
  delete next.id
  delete next.createdAt
  delete next.updatedAt
  delete next.customer
  next.amount = Number(next.amount || 0)
  next.amountPaid = Number(next.amountPaid || 0)
  return next
}

router.get('/', async (req, res) => {
  try {
    res.json(await prisma.invoice.findMany({
      include: { customer:{select:{id:true,name:true}}, items:true, payments:true },
      orderBy: { createdAt:'desc' }
    }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.post('/', async (req, res) => {
  try {
    const { customerId, items, orderId, createdById, ...rest } = sanitizeInvoicePayload(req.body)
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } })
    res.status(201).json(await prisma.invoice.create({
      data: {
        id: makeBusinessId('invoice', customer?.name || 'INVOICE'),
        ...rest,
        customer: { connect:{id:customerId} },
        ...(orderId ? { order:{connect:{id:orderId}} } : {}),
        ...(createdById ? { createdBy:{connect:{id:createdById}} } : {}),
        items: { create: (items||[]).map(it=>({ type:it.type, qty:Number(it.qty||1), price:Number(it.price||0), bulkDesc:it.bulkDesc, isBulk:!!it.isBulk })) }
      },
      include: { items:true, customer:{select:{id:true,name:true}}, payments:true }
    }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.patch('/:id', async (req, res) => {
  try {
    const { items, ...rest } = sanitizeInvoicePayload(req.body)
    if (Array.isArray(items)) {
      await prisma.invoiceItem.deleteMany({ where:{invoiceId:req.params.id} })
    }
    res.json(await prisma.invoice.update({
      where:{id:req.params.id},
      data:{
        ...rest,
        ...(Array.isArray(items)
          ? { items:{ create:items.map(it=>({type:it.type,qty:Number(it.qty||1),price:Number(it.price||0),bulkDesc:it.bulkDesc,isBulk:!!it.isBulk})) } }
          : {}),
      },
      include:{items:true, customer:{select:{id:true,name:true}}, payments:true}
    }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.delete('/:id', async (req, res) => {
  try { await prisma.invoice.delete({ where:{id:req.params.id} }); res.json({ success:true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
export default router
