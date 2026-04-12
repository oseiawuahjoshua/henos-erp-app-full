// src/routes/users.js — User Management endpoints
import express from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

// All user management routes require being logged in
router.use(requireAuth)

// ── GET /api/users ────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id:true, name:true, role:true, email:true, phone:true, department:true, modules:true, active:true, avatar:true, isDefault:true, lastLogin:true, createdAt:true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users.' })
  }
})

// ── POST /api/users ───────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, name, password, role, email, phone, department, modules, avatar } = req.body

    if (!id || !name || !password) {
      return res.status(400).json({ error: 'ID, name, and password are required.' })
    }

    // Hash the password before storing (NEVER store plain text passwords)
    // bcrypt turns "MyPass123" into a scrambled string like "$2b$10$..."
    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { id: id.toUpperCase(), name, password: hashed, role: role||'viewer', email: email||null, phone: phone||null, department: department||null, modules: modules||[], avatar: avatar||null }
    })

    // Don't send the password back
    const { password: _, ...safeUser } = user
    res.status(201).json(safeUser)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Employee ID already exists.' })
    res.status(500).json({ error: 'Could not create user.' })
  }
})

// ── PATCH /api/users/:id ──────────────────────────────────────
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { password, ...rest } = req.body
    const data = { ...rest }
    if (password) data.password = await bcrypt.hash(password, 10)

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id:true, name:true, role:true, email:true, phone:true, department:true, modules:true, active:true, avatar:true }
    })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Could not update user.' })
  }
})

// ── DELETE /api/users/:id ─────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (user?.isDefault) return res.status(403).json({ error: 'Cannot delete the default admin.' })
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Could not delete user.' })
  }
})

export default router
