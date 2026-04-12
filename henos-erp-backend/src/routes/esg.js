import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('esg'))
router.get('/metrics', async (req, res) => {
  try {
    let m = await prisma.esgMetrics.findUnique({ where:{id:'singleton'} })
    if (!m) m = await prisma.esgMetrics.create({ data:{id:'singleton'} })
    res.json(m)
  } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/metrics', async (req, res) => {
  try { res.json(await prisma.esgMetrics.upsert({ where:{id:'singleton'}, update:req.body, create:{id:'singleton',...req.body} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.get('/logs', async (req, res) => {
  try { res.json(await prisma.esgLog.findMany({ orderBy:{createdAt:'desc'} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/logs', async (req, res) => {
  try { res.status(201).json(await prisma.esgLog.create({ data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
