import express from 'express'
import { ControlError, TransactionControl } from './control.ts'
import type { Actor, Role } from './domain.ts'
import { toMinor } from './money.ts'

function actorFrom(req: express.Request): Actor {
  const role = req.header('x-demo-role')
  const id = req.header('x-demo-actor') || 'anonymous'
  const allowed: Role[] = ['admin', 'analyst', 'customer']
  if (!role || !allowed.includes(role as Role)) return { id, role: 'customer' }
  return { id, role: role as Role }
}

export function createApp(control: TransactionControl) {
  const app = express()
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mongo: false, persistence: 'memory' })
  })

  app.get('/api/policy', (_req, res) => {
    res.json(control.snapshot().policy)
  })

  app.post('/api/history', (req, res, next) => {
    try {
      const actor = actorFrom(req)
      if (actor.role === 'customer') {
        res.status(403).json({ error: 'Not allowed to import history' })
        return
      }
      const records = (req.body?.records ?? []) as {
        customer?: string
        merchant?: string
        amount?: number
        createdAt?: string
        reference?: string
        channel?: string
      }[]
      let imported = 0
      for (const record of records) {
        if (!record.customer || !record.merchant || record.amount == null || !record.createdAt || !record.reference) continue
        if (!control.snapshot().accounts.some((account) => account.customer === record.customer)) {
          control.openAccount(record.customer, 200_000_000, 'USD')
        }
        const before = control.snapshot().transactions.length
        control.recordHistory({
          customer: record.customer,
          merchant: record.merchant,
          amountMinor: toMinor(record.amount),
          createdAt: record.createdAt,
          reference: record.reference,
          channel: record.channel,
        })
        if (control.snapshot().transactions.length > before) imported += 1
      }
      res.json({ imported })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/transactions/batch', async (req, res, next) => {
    try {
      const rows = (req.body?.transactions ?? []) as {
        customer?: string
        merchant?: string
        channel?: string
        amount?: number
        createdAt?: string
        idempotencyKey?: string
        reference?: string
      }[]
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ error: 'transactions are required' })
        return
      }
      const transactions = []
      for (const body of rows) {
        if (!body.customer || !body.merchant || body.amount == null || !body.idempotencyKey) {
          res.status(400).json({ error: 'Each transaction needs customer, merchant, amount, and idempotencyKey' })
          return
        }
        if (!control.snapshot().accounts.some((account) => account.customer === body.customer)) {
          control.openAccount(body.customer, 200_000_000, 'USD')
        }
        const tx = await control.submitOutgoing({
          customer: body.customer,
          merchant: body.merchant,
          channel: body.channel ?? 'wire',
          amountMinor: toMinor(body.amount),
          createdAt: body.createdAt,
          idempotencyKey: body.idempotencyKey,
          reference: body.reference,
          currency: 'USD',
        })
        transactions.push(publicTx(tx))
      }
      res.status(201).json({ transactions })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/transactions', async (req, res, next) => {
    try {
      const body = req.body as {
        customer?: string
        merchant?: string
        channel?: string
        amount?: number
        createdAt?: string
        idempotencyKey?: string
        reference?: string
        currency?: string
      }
      if (!body.customer || !body.merchant || !body.idempotencyKey || body.amount == null) {
        res.status(400).json({ error: 'customer, merchant, amount, and idempotencyKey are required' })
        return
      }
      const tx = await control.submitOutgoing({
        customer: body.customer,
        merchant: body.merchant,
        channel: body.channel ?? 'wire',
        amountMinor: toMinor(body.amount),
        createdAt: body.createdAt,
        idempotencyKey: body.idempotencyKey,
        reference: body.reference,
        currency: body.currency,
      })
      res.status(tx.lifecycle === 'COMPLETED' ? 201 : 202).json(publicTx(tx))
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/transactions/:reference/execute', async (req, res, next) => {
    try {
      const tx = await control.execute(req.params.reference, actorFrom(req))
      res.json(publicTx(tx))
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/transactions/:reference/approve', async (req, res, next) => {
    try {
      const tx = await control.approveHold(req.params.reference, actorFrom(req), String(req.body?.reason ?? ''))
      res.json(publicTx(tx))
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/transactions/:reference/reject', async (req, res, next) => {
    try {
      const tx = await control.rejectHold(req.params.reference, actorFrom(req), String(req.body?.reason ?? ''))
      res.json(publicTx(tx))
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/policy', (req, res, next) => {
    try {
      const policy = control.updatePolicy(actorFrom(req), req.body?.patch ?? {}, String(req.body?.reason ?? ''))
      res.json(policy)
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/audit', (_req, res) => {
    res.json(control.snapshot().audits)
  })

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ControlError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    const message = error instanceof Error ? error.message : 'Unexpected error'
    res.status(400).json({ error: message })
  })

  return app
}

function publicTx(tx: ReturnType<TransactionControl['snapshot']>['transactions'][number]) {
  return {
    reference: tx.reference,
    customer: tx.customer,
    merchant: tx.merchant,
    amount: tx.amountMinor / 100,
    currency: tx.currency,
    lifecycle: tx.lifecycle,
    score: tx.score,
    category: tx.category,
    action: tx.action,
    reasons: tx.reasons,
    rulesetVersion: tx.rulesetVersion,
    createdAt: tx.createdAt,
  }
}
