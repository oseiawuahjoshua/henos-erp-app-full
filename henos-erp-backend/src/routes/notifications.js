import express from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth)
router.get('/:channel', async (req, res) => {
  try { res.json(await prisma.notification.findMany({ where:{channel:req.params.channel}, orderBy:{createdAt:'desc'}, take:50 })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.post('/', async (req, res) => {
  try { res.status(201).json(await prisma.notification.create({ data:req.body })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/:id/read', async (req, res) => {
  try { res.json(await prisma.notification.update({ where:{id:req.params.id}, data:{read:true} })) } catch (e) { res.status(500).json({error:e.message}) }
})
router.patch('/read-all/:channel', async (req, res) => {
  try { await prisma.notification.updateMany({ where:{channel:req.params.channel,read:false}, data:{read:true} }); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) }
})
export default router
