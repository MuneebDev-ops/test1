import type { GeneratedBatch } from './generate'
import type { Risk, Transaction } from '../types'

const headers = {
  'content-type': 'application/json',
  'x-demo-role': 'analyst',
  'x-demo-actor': 'Maya Chen',
}

let imported = false

export async function ensureHistory(transactions: Transaction[]) {
  if (imported) return
  const records = transactions
    .filter((tx) => tx.status === 'completed')
    .map((tx) => ({
      customer: tx.customer,
      merchant: tx.merchant,
      amount: tx.amount,
      createdAt: tx.createdAt,
      reference: tx.reference,
      channel: tx.channel,
    }))
  const response = await fetch('/api/history', {
    method: 'POST',
    headers,
    body: JSON.stringify({ records }),
  })
  if (!response.ok) throw new Error('The fraud service could not import transaction history.')
  imported = true
}

export async function gateBatch(batch: GeneratedBatch): Promise<GeneratedBatch> {
  const response = await fetch('/api/transactions/batch', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      transactions: batch.transactions.map((tx) => ({
        customer: tx.customer,
        merchant: tx.merchant,
        channel: tx.channel,
        amount: tx.amount,
        createdAt: tx.createdAt,
        reference: tx.reference,
        idempotencyKey: tx.reference,
      })),
    }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || 'The fraud service refused to assess this transaction.')
  }
  const payload = (await response.json()) as {
    transactions: { reference: string; lifecycle: string; score: number; category: string; reasons: string[] }[]
  }
  const byRef = new Map(payload.transactions.map((tx) => [tx.reference, tx]))
  const transactions = batch.transactions.map((tx) => {
    const decision = byRef.get(tx.reference)
    if (!decision) return tx
    const risk: Risk = decision.category === 'low' ? 'low' : decision.category === 'moderate' ? 'elevated' : 'high'
    return {
      ...tx,
      score: decision.score,
      risk,
      status: decision.lifecycle === 'COMPLETED' ? ('completed' as const) : ('review' as const),
      reasons: decision.reasons.length > 0 ? decision.reasons : tx.reasons,
    }
  })
  const alerts = transactions
    .filter((tx) => tx.status === 'review')
    .map((tx) => ({
      id: `al-${tx.reference}`,
      transactionId: tx.id,
      reference: tx.reference,
      merchant: tx.merchant,
      customer: tx.customer,
      amount: tx.amount,
      score: tx.score,
      status: 'open' as const,
      disposition: null,
      assignee: null,
      createdAt: tx.createdAt,
      caseId: null,
    }))
  return { transactions, alerts, events: batch.events }
}
