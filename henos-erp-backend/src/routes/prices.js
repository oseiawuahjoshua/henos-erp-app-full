import express from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth)

function sanitizePricePayload(body = {}) {
  const next = { ...body }
  delete next.id
  delete next.createdAt
  delete next.updatedAt
  if (next.price !== undefined && next.price !== null && next.price !== '') {
    next.price = Number(next.price)
  }
  if (next.price === '') next.price = null
  return next
}

router.get('/', async (req, res) => {
  try { res.json(await prisma.price.findMany({ orderBy:{createdAt:'desc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/', async (req, res) => {
  try { res.status(201).json(await prisma.price.create({ data:sanitizePricePayload(req.body) })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/:id', async (req, res) => {
  try { res.json(await prisma.price.update({ where:{id:req.params.id}, data:sanitizePricePayload(req.body) })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.delete('/:id', async (req, res) => {
  try { await prisma.price.delete({ where:{id:req.params.id} }); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
