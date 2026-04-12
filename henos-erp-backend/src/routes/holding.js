import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('operations'))
router.get('/:area', async (req, res) => {
  try { res.json(await prisma.holdingRecord.findMany({ where:{area:req.params.area}, orderBy:{date:'desc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/:area', async (req, res) => {
  try {
    const rec = await prisma.holdingRecord.upsert({
      where:{area_date:{area:req.params.area, date:req.body.date}},
      update:{rows:req.body.rows}, create:{area:req.params.area, date:req.body.date, rows:req.body.rows}
    })
    res.json(rec)
  } catch (e) { res.status(500).json({error:e.message}) }
})
router.delete('/:area/:date', async (req, res) => {
  try { await prisma.holdingRecord.deleteMany({ where:{area:req.params.area, date:req.params.date} }); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
