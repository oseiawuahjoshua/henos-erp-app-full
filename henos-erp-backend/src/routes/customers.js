import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
import { makeBusinessId } from '../utils/ids.js'
const router = express.Router()
router.use(requireAuth)

function normalizeCustomerPayload(body = {}) {
  return {
    ...body,
    name: body.name ? body.name.trim().toUpperCase() : body.name,
    type: body.type === 'CRM DTD' ? 'Commercial' : body.type,
  }
}

function canReadCustomers(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' })
  const modules = req.user.modules || []
  const allowed =
    req.user.role === 'admin' ||
    modules.includes('commercial') ||
    modules.includes('accounts') ||
    modules.includes('operations')
  if (!allowed) {
    return res.status(403).json({ error: 'Access to customers denied.' })
  }
  next()
}

router.get('/', canReadCustomers, async (req, res) => {
  try { res.json(await prisma.customer.findMany({ orderBy: { name:'asc' } })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.post('/', requireModule('commercial'), async (req, res) => {
  try {
    const payload = normalizeCustomerPayload(req.body)
    const created = await prisma.customer.create({ data: { ...payload, id: makeBusinessId('customer', payload.name) } })
    res.status(201).json(created)
  }
  catch (e) {
    if (e.code === 'P2002' && req.body?.name) {
      const existing = await prisma.customer.findUnique({ where: { name: req.body.name.trim().toUpperCase() } })
      if (existing) return res.json(existing)
    }
    res.status(500).json({ error: e.message })
  }
})
router.patch('/:id', requireModule('commercial'), async (req, res) => {
  try { res.json(await prisma.customer.update({ where:{id:req.params.id}, data:normalizeCustomerPayload(req.body) })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.delete('/:id', requireModule('commercial'), async (req, res) => {
  try { await prisma.customer.delete({ where:{id:req.params.id} }); res.json({ success:true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
export default router
