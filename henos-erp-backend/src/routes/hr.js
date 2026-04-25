import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireManagerOrAdmin } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, requireManagerOrAdmin)

router.get('/leave-schedules', async (req, res) => {
  try {
    res.json(await prisma.leaveSchedule.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/leave-schedules', async (req, res) => {
  try {
    const payload = { ...req.body }
    if ('days' in payload) payload.days = payload.days !== null ? Number(payload.days) : null
    res.status(201).json(await prisma.leaveSchedule.create({ data: payload }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/leave-schedules/:id', async (req, res) => {
  try {
    const payload = { ...req.body }
    if ('days' in payload) payload.days = payload.days !== null ? Number(payload.days) : null
    res.json(await prisma.leaveSchedule.update({ where: { id: req.params.id }, data: payload }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/leave-schedules/:id', async (req, res) => {
  try {
    await prisma.leaveSchedule.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/salaries', async (req, res) => {
  try {
    res.json(await prisma.salaryRecord.findMany({ orderBy: { createdAt: 'desc' } }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/salaries', async (req, res) => {
  try {
    const payload = { ...req.body, amount: Number(req.body?.amount || 0) }
    res.status(201).json(await prisma.salaryRecord.create({ data: payload }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/salaries/:id', async (req, res) => {
  try {
    const payload = { ...req.body }
    if ('amount' in payload) payload.amount = Number(payload.amount || 0)
    res.json(await prisma.salaryRecord.update({ where: { id: req.params.id }, data: payload }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/salaries/:id', async (req, res) => {
  try {
    await prisma.salaryRecord.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
