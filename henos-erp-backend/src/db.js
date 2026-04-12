// ─────────────────────────────────────────────────────────────
// src/db.js — The database connection
//
// PrismaClient is the "translator" between your JavaScript code
// and the PostgreSQL database. Instead of writing raw SQL like:
//   SELECT * FROM users WHERE id = 'HN-ADMIN-001'
//
// You write JavaScript like:
//   prisma.user.findUnique({ where: { id: 'HN-ADMIN-001' } })
//
// Prisma handles the SQL for you automatically.
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],   // shows database errors in your terminal
})

export default prisma
