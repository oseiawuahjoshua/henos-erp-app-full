import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('stations'))
router.get('/', async (req, res) => {
  try { res.json(await prisma.station.findMany({ include:{readings:{orderBy:{date:'desc'}}}, orderBy:{createdAt:'asc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/', async (req, res) => {
  try { res.status(201).json(await prisma.station.create({ data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/:id', async (req, res) => {
  try { res.json(await prisma.station.update({ where:{id:req.params.id}, data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/:id/readings', async (req, res) => {
  try {
    const rec = await prisma.stationReading.upsert({
      where:{stationId_date:{stationId:req.params.id, date:req.body.date}},
      update:{tanks:req.body.tanks, by:req.body.by, notes:req.body.notes},
      create:{stationId:req.params.id, date:req.body.date, tanks:req.body.tanks, by:req.body.by||null, notes:req.body.notes||null}
    })
    res.json(rec)
  } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
