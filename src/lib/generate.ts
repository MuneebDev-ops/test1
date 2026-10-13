import { CHANNELS, CUSTOMERS, MERCHANTS } from '../data/catalog'
import type { Alert, Rule, Scenario, Transaction } from '../types'
import { pipelineFor } from './pipeline'
import { mulberry32, pick } from './prng'
import { scoreTransaction } from './scoring'

export interface GeneratedBatch {
  transactions: Transaction[]
  alerts: Alert[]
  events: ReturnType<typeof pipelineFor>
}

function uniqueReference(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function generateTransactions(options: {
  scenario: Scenario
  seed: number
  count: number
  rules: Rule[]
  existing: Transaction[]
  now?: number
}): GeneratedBatch {
  const count = Math.max(1, Math.min(25, Math.floor(options.count)))
  const seed = Math.max(0, Math.floor(options.seed))
  const rng = mulberry32(seed || 1)
  const now = options.now ?? Date.now()
  const taken = new Set(options.existing.map((tx) => tx.reference))
  const created: Transaction[] = []
  const step = 2 * 60 * 1000

  for (let index = 0; index < count; index += 1) {
    const suspicious = options.scenario === 'suspicious'
    const customer = suspicious ? 'Avery Morgan' : pick(rng, CUSTOMERS)
    const merchant = suspicious ? 'Northstar Market' : pick(rng, MERCHANTS)
    const channel = suspicious ? 'card_not_present' : pick(rng, CHANNELS)
    const highValue = options.rules.find((rule) => rule.id === 'high-value')
    const amount = suspicious
      ? Math.round(((highValue?.threshold ?? 5000) + 25 + rng() * 900) * 100) / 100
      : Math.round((8 + rng() * 470) * 100) / 100
    const createdAt = new Date(now - (count - 1 - index) * step).toISOString()
    const reference = uniqueReference(`SG-SIM-${seed}-${String(index + 1).padStart(3, '0')}`, taken)
    taken.add(reference)
    const scored = scoreTransaction(
      { channel, amount, customer, createdAt },
      options.rules,
      [...options.existing, ...created],
    )
    created.push({
      id: `tx-${reference}`,
      reference,
      customer,
      merchant,
      channel,
      amount,
      createdAt,
      ...scored,
    })
  }

  const alerts: Alert[] = created
    .filter((tx) => tx.risk === 'high')
    .map((tx) => ({
      id: `al-${tx.reference}`,
      transactionId: tx.id,
      reference: tx.reference,
      merchant: tx.merchant,
      customer: tx.customer,
      amount: tx.amount,
      score: tx.score,
      status: 'open',
      disposition: null,
      assignee: null,
      createdAt: tx.createdAt,
      caseId: null,
    }))

  return {
    transactions: created,
    alerts,
    events: created.flatMap(pipelineFor),
  }
}
