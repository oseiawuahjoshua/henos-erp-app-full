import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('operations'))
router.get('/', async (req, res) => {
  try { res.json(await prisma.supplier.findMany({ orderBy:{name:'asc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/', async (req, res) => {
  try { res.status(201).json(await prisma.supplier.create({ data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/:id', async (req, res) => {
  try { res.json(await prisma.supplier.update({ where:{id:req.params.id}, data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.delete('/:id', async (req, res) => {
  try { await prisma.supplier.delete({ where:{id:req.params.id} }); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
