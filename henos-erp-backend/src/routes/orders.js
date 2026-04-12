import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth)

function requireOrderAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' })
  const modules = req.user.modules || []
  const allowed =
    req.user.role === 'admin' ||
    req.user.role === 'operations' ||
    modules.includes('commercial') ||
    modules.includes('operations')
  if (!allowed) {
    return res.status(403).json({ error: 'Access to orders denied.' })
  }
  next()
}

router.get('/', requireOrderAccess, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { customer: { select:{name:true} }, placedBy: { select:{name:true} } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(orders)
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.post('/', requireModule('commercial'), async (req, res) => {
  try {
    const { customerId, placedById, ...rest } = req.body
    res.status(201).json(await prisma.order.create({
      data: { ...rest, customer: { connect:{id:customerId} }, ...(placedById ? { placedBy:{connect:{id:placedById}} } : {}) }
    }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.patch('/:id', async (req, res) => {
  try { res.json(await prisma.order.update({ where:{id:req.params.id}, data:req.body })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.delete('/:id', async (req, res) => {
  try { await prisma.order.delete({ where:{id:req.params.id} }); res.json({ success:true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
export default router
