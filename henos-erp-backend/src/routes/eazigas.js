import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('eazigas'))
router.get('/', async (req, res) => {
  try { res.json(await prisma.exchangePoint.findMany({ include:{records:{orderBy:{date:'desc'}}}, orderBy:{createdAt:'asc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/', async (req, res) => {
  try { res.status(201).json(await prisma.exchangePoint.create({ data:{name:req.body.name, location:req.body.location||null} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/:id', async (req, res) => {
  try { res.json(await prisma.exchangePoint.update({ where:{id:req.params.id}, data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.delete('/:id', async (req, res) => {
  try { await prisma.exchangePoint.delete({ where:{id:req.params.id} }); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/:id/records', async (req, res) => {
  try {
    const rec = await prisma.epRecord.upsert({
      where:{exchangePointId_date:{exchangePointId:req.params.id, date:req.body.date}},
      update:{rows:req.body.rows}, create:{exchangePointId:req.params.id, date:req.body.date, rows:req.body.rows}
    })
    res.json(rec)
  } catch (e) { res.status(500).json({error:e.message}) }
})
router.delete('/:id/records/:date', async (req, res) => {
  try { await prisma.epRecord.deleteMany({ where:{exchangePointId:req.params.id, date:req.params.date} }); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
