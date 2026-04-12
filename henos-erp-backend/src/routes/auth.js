// src/routes/auth.js — Login / Logout endpoints
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// ── POST /api/auth/login ──────────────────────────────────────
// The frontend sends: { employeeId, password }
// We check the database, and if correct, send back a JWT token.
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body

    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required.' })
    }

    // Find the user in the database (case-insensitive ID)
    const user = await prisma.user.findFirst({
      where: {
        id: { equals: employeeId.trim().toUpperCase(), mode: 'insensitive' },
        active: true,
      }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid Employee ID or Password.' })
    }

    // bcrypt.compare checks the password against the stored hash
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid Employee ID or Password.' })
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Create a JWT token — expires in 8 hours
    const token = jwt.sign(
      {
        id:         user.id,
        name:       user.name,
        role:       user.role,
        modules:    user.modules,
        department: user.department,
        avatar:     user.avatar,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    // Send the token + user info back to the frontend
    res.json({
      token,
      user: {
        id:         user.id,
        name:       user.name,
        role:       user.role,
        modules:    user.modules,
        department: user.department,
        email:      user.email,
        phone:      user.phone,
        avatar:     user.avatar,
        lastLogin:  user.lastLogin,
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error during login.' })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────
// Returns the currently logged-in user's info (using their token)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id:true, name:true, role:true, modules:true, department:true, email:true, phone:true, avatar:true, active:true }
    })
    if (!user || !user.active) return res.status(401).json({ error: 'User not found or inactive.' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user.' })
  }
})

export default router
