import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth)

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
  try { res.status(201).json(await prisma.customer.create({ data: req.body })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.patch('/:id', requireModule('commercial'), async (req, res) => {
  try { res.json(await prisma.customer.update({ where:{id:req.params.id}, data:req.body })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.delete('/:id', requireModule('commercial'), async (req, res) => {
  try { await prisma.customer.delete({ where:{id:req.params.id} }); res.json({ success:true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
export default router
