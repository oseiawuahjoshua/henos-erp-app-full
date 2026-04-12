import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('operations'))
router.get('/', async (req, res) => {
  try { res.json(await prisma.delivery.findMany({ include:{items:true}, orderBy:{createdAt:'desc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/', async (req, res) => {
  try {
    const { items, ...rest } = req.body
    res.status(201).json(await prisma.delivery.create({
      data:{ ...rest, items:{create:(items||[]).map(it=>({type:it.type,qty:Number(it.qty||1),bulkDesc:it.bulkDesc||null,isBulk:!!it.isBulk}))} },
      include:{items:true}
    }))
  } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/:id', async (req, res) => {
  try { res.json(await prisma.delivery.update({ where:{id:req.params.id}, data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.delete('/:id', async (req, res) => {
  try { await prisma.delivery.delete({ where:{id:req.params.id} }); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) }
})
router.get('/log', async (req, res) => {
  try { res.json(await prisma.deliveredLog.findMany({ orderBy:{createdAt:'desc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/log', async (req, res) => {
  try { res.status(201).json(await prisma.deliveredLog.create({ data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
