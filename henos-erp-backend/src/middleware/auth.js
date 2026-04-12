// ─────────────────────────────────────────────────────────────
// src/middleware/auth.js — Token verification
//
// When a user logs in, the backend gives them a "token" —
// like a wristband at a concert. On every future request,
// the frontend sends this token and the server checks:
// "Is this wristband real? Who does it belong to?"
//
// JWT = JSON Web Token. It's an industry-standard secure token.
// ─────────────────────────────────────────────────────────────

import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  // The token comes in the request header: Authorization: Bearer <token>
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' })
  }

  const token = header.split(' ')[1]

  try {
    // jwt.verify checks the token is valid and decodes it
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded    // attach user info to the request for use in routes
    next()                // continue to the actual route handler
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid or expired. Please log in again.' })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' })
  }
  next()
}

export function requireModule(moduleId) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated.' })
    const canAccess = req.user.role === 'admin' || (req.user.modules || []).includes(moduleId)
    if (!canAccess) {
      return res.status(403).json({ error: `Access to "${moduleId}" module denied.` })
    }
    next()
  }
}
