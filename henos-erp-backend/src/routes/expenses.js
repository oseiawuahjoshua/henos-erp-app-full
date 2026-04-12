import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('accounts'))

router.get('/', async (req, res) => {
  try { res.json(await prisma.expense.findMany({ include:{items:true}, orderBy:{createdAt:'desc'} })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.post('/', async (req, res) => {
  try {
    const { items, createdById, ...rest } = req.body
    res.status(201).json(await prisma.expense.create({
      data: { ...rest, ...(createdById?{createdBy:{connect:{id:createdById}}}:{}), items:{create:(items||[]).map(it=>({description:it.description,qty:Number(it.qty||1),unitCost:Number(it.unitCost||0)}))} },
      include:{items:true}
    }))
  } catch (e) { res.status(500).json({ error: e.message }) }
})
router.patch('/:id', async (req, res) => {
  try { res.json(await prisma.expense.update({ where:{id:req.params.id}, data:req.body })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
router.delete('/:id', async (req, res) => {
  try { await prisma.expense.delete({ where:{id:req.params.id} }); res.json({ success:true }) }
  catch (e) { res.status(500).json({ error: e.message }) }
})
export default router
