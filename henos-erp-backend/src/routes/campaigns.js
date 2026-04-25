import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'
const router = express.Router()
router.use(requireAuth, requireModule('marketing'))
router.get('/',        async (req, res) => { try { res.json(await prisma.campaign.findMany({ orderBy:{createdAt:'desc'} })) } catch (e) { res.status(500).json({error:e.message}) } })
router.post('/',       async (req, res) => { try { res.status(201).json(await prisma.campaign.create({data:req.body})) } catch (e) { res.status(500).json({error:e.message}) } })
router.patch('/:id',   async (req, res) => { try { res.json(await prisma.campaign.update({where:{id:req.params.id},data:req.body})) } catch (e) { res.status(500).json({error:e.message}) } })
router.delete('/:id',  async (req, res) => { try { await prisma.campaign.delete({where:{id:req.params.id}}); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) } })
router.get('/leads',       async (req, res) => { try { res.json(await prisma.lead.findMany({ orderBy:{createdAt:'desc'} })) } catch (e) { res.status(500).json({error:e.message}) } })
router.post('/leads',      async (req, res) => { try { res.status(201).json(await prisma.lead.create({data:req.body})) } catch (e) { res.status(500).json({error:e.message}) } })
router.patch('/leads/:id', async (req, res) => { try { res.json(await prisma.lead.update({where:{id:req.params.id},data:req.body})) } catch (e) { res.status(500).json({error:e.message}) } })
router.delete('/leads/:id',async (req, res) => { try { await prisma.lead.delete({where:{id:req.params.id}}); res.json({success:true}) } catch (e) { res.status(500).json({error:e.message}) } })
export default router
