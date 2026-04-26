import express from 'express'
import prisma from '../db.js'
import { requireAuth, requireModule } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, requireModule('accounts'))

function sanitizePaymentPayload(body = {}) {
  return {
    invoiceId: body.invoiceId,
    customerId: body.customerId,
    date: body.date || null,
    amount: Number(body.amount || 0),
    method: body.method || null,
    reference: body.reference || null,
    notes: body.notes || null,
    recordedByName: body.recordedByName || null,
  }
}

router.get('/', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        customer: { select: { name: true } },
        invoice: { select: { id: true, amount: true, amountPaid: true, status: true, dueDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(payments)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const payload = sanitizePaymentPayload(req.body)
    const invoice = await prisma.invoice.findUnique({
      where: { id: payload.invoiceId },
      include: { customer: { select: { id: true, name: true } } },
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' })
    }

    const balance = Math.max(0, Number(invoice.amount || 0) - Number(invoice.amountPaid || 0))
    if (!payload.amount || payload.amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' })
    }
    if (payload.amount > balance) {
      return res.status(400).json({ error: 'Payment amount exceeds invoice balance.' })
    }

    const newPaid = Number(invoice.amountPaid || 0) + payload.amount
    const newStatus = newPaid >= Number(invoice.amount || 0) ? 'Paid' : 'Partial'
    const receiptNo = `RCP-${Date.now().toString().slice(-8)}`

    const result = await prisma.$transaction(async tx => {
      const payment = await tx.payment.create({
        data: {
          ...payload,
          customerId: payload.customerId || invoice.customerId,
          receiptNo,
        },
        include: {
          customer: { select: { name: true } },
          invoice: { select: { id: true, amount: true, amountPaid: true, status: true, dueDate: true } },
        },
      })

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newPaid,
          status: newStatus,
          payRef: payload.reference,
          lastPayDate: payload.date,
        },
        include: {
          customer: { select: { name: true } },
          items: true,
          payments: true,
        },
      })

      return { payment, invoice: updatedInvoice }
    })

    res.status(201).json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' })
    }

    await prisma.$transaction(async tx => {
      const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } })
      const nextPaid = Math.max(0, Number(invoice?.amountPaid || 0) - Number(payment.amount || 0))
      const nextStatus = nextPaid <= 0 ? 'Unpaid' : nextPaid >= Number(invoice?.amount || 0) ? 'Paid' : 'Partial'

      await tx.payment.delete({ where: { id: payment.id } })
      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaid: nextPaid,
          status: nextStatus,
        },
      })
    })

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
