// ─────────────────────────────────────────────────────────────
// src/index.js — The main server file
//
// Think of this as the "front door" of the backend.
// When you run "npm run dev", Node.js starts this file.
// It sets up Express (a web framework) to listen for requests
// from the React frontend and respond with data from PostgreSQL.
// ─────────────────────────────────────────────────────────────

import 'dotenv/config'          // loads your .env file
import express from 'express'   // the web framework
import cors from 'cors'         // allows the frontend to talk to this server

// Import all route files (each file handles one section)
import authRoutes         from './routes/auth.js'
import userRoutes         from './routes/users.js'
import customerRoutes     from './routes/customers.js'
import orderRoutes        from './routes/orders.js'
import invoiceRoutes      from './routes/invoices.js'
import expenseRoutes      from './routes/expenses.js'
import priceRoutes        from './routes/prices.js'
import stockRoutes        from './routes/stock.js'
import deliveryRoutes     from './routes/deliveries.js'
import supplierRoutes     from './routes/suppliers.js'
import eaziGasRoutes      from './routes/eazigas.js'
import holdingRoutes      from './routes/holding.js'
import stationRoutes      from './routes/stations.js'
import campaignRoutes     from './routes/campaigns.js'
import esgRoutes          from './routes/esg.js'
import notifRoutes        from './routes/notifications.js'

const app  = express()
const PORT = process.env.PORT || 4000

// ── Middleware ────────────────────────────────────────────────
// Middleware = code that runs on EVERY request before the route handler.
// Think of it like a security guard + translator at the door.

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())         // lets us read JSON data from the frontend

// ── Health check ──────────────────────────────────────────────
// A simple route to confirm the server is running.
// Visit http://localhost:4000/health in your browser to test it.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Henos Energy ERP Backend is running! 🚀',
    time: new Date().toISOString(),
  })
})

// ── API Routes ─────────────────────────────────────────────────
// All routes start with /api/ so it's clear they're API endpoints.
// e.g. POST /api/auth/login   → handled by authRoutes
//      GET  /api/orders       → handled by orderRoutes

app.use('/api/auth',          authRoutes)
app.use('/api/users',         userRoutes)
app.use('/api/customers',     customerRoutes)
app.use('/api/orders',        orderRoutes)
app.use('/api/invoices',      invoiceRoutes)
app.use('/api/expenses',      expenseRoutes)
app.use('/api/prices',        priceRoutes)
app.use('/api/stock',         stockRoutes)
app.use('/api/deliveries',    deliveryRoutes)
app.use('/api/suppliers',     supplierRoutes)
app.use('/api/eazigas',       eaziGasRoutes)
app.use('/api/holding',       holdingRoutes)
app.use('/api/stations',      stationRoutes)
app.use('/api/campaigns',     campaignRoutes)
app.use('/api/esg',           esgRoutes)
app.use('/api/notifications', notifRoutes)

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err)
  res.status(500).json({ error: 'Internal server error', detail: err.message })
})

// ── Start listening ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║  🔥  Henos Energy ERP — Backend Server  ║
  ║      Running on http://localhost:${PORT}    ║
  ║      Health: http://localhost:${PORT}/health║
  ╚══════════════════════════════════════════╝
  `)
})
