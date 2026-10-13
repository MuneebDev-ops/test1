import type { Channel, Risk, Rule, Transaction, TxStatus } from '../types'

export function riskFromScore(score: number): Risk {
  if (score >= 70) return 'high'
  if (score >= 40) return 'elevated'
  return 'low'
}

export function scoreTransaction(
  input: { channel: Channel; amount: number; customer: string; createdAt: string },
  rules: Rule[],
  existing: Transaction[],
): { score: number; risk: Risk; status: TxStatus; reasons: string[] } {
  const byId = new Map(rules.map((rule) => [rule.id, rule]))
  let score = 8
  const reasons: string[] = []

  const cardNotPresent = byId.get('cnp')
  if (
    cardNotPresent?.enabled &&
    input.channel === 'card_not_present' &&
    input.amount >= cardNotPresent.threshold
  ) {
    score += 24
    reasons.push('Card-not-present channel')
  }

  const highValue = byId.get('high-value')
  if (highValue?.enabled && input.amount >= highValue.threshold) {
    score = Math.max(score, 80)
    reasons.push('High-value transaction')
  }

  const rapid = byId.get('rapid')
  if (rapid?.enabled) {
    const at = new Date(input.createdAt).getTime()
    const recent = existing.filter((tx) => {
      if (tx.customer !== input.customer) return false
      return Math.abs(new Date(tx.createdAt).getTime() - at) <= 60 * 60 * 1000
    }).length
    if (recent + 1 >= rapid.threshold) {
      score = Math.max(score, 76)
      reasons.push('Rapid customer sequence')
    }
  }

  if (reasons.length === 0) reasons.push('Baseline activity')
  const risk = riskFromScore(score)
  return {
    score,
    risk,
    status: risk === 'high' ? 'review' : 'completed',
    reasons,
  }
}
