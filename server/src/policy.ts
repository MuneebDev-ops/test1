import type { PolicyConfig, RuleConfig } from './domain.ts'

const MANDATORY = new Set(['INSUFFICIENT_AVAILABLE_BALANCE', 'EXISTING_ACCOUNT_RESTRICTION'])

export function defaultPolicy(now = '2026-10-13T08:00:00.000Z'): PolicyConfig {
  const rules: RuleConfig[] = [
    { id: 'AMOUNT_DEVIATION', name: 'Amount deviation', enabled: true, weight: 35, threshold: 3, minimumConfidence: 0.4, action: 'score', priority: 10 },
    { id: 'UNUSUAL_TRANSACTION_HOUR', name: 'Unusual hour', enabled: true, weight: 20, threshold: 0.08, minimumConfidence: 0.4, action: 'score', priority: 20 },
    { id: 'HIGH_TRANSACTION_VELOCITY', name: 'Transaction velocity', enabled: true, weight: 30, threshold: 3, minimumConfidence: 0, action: 'score', priority: 30 },
    { id: 'NEW_RECIPIENT', name: 'New recipient', enabled: true, weight: 15, threshold: 0, minimumConfidence: 0, action: 'score', priority: 40 },
    { id: 'RECENT_UNEXPLAINED_FUNDS', name: 'Unexplained funds', enabled: true, weight: 15, threshold: 1, minimumConfidence: 0, action: 'score', priority: 50 },
    { id: 'RAPID_OUTGOING_AFTER_INCOMING', name: 'Rapid outgoing after incoming', enabled: true, weight: 25, threshold: 70, minimumConfidence: 0, action: 'score', priority: 60 },
    { id: 'BALANCE_RECONCILIATION_FAILURE', name: 'Balance reconciliation', enabled: true, weight: 40, threshold: 0, minimumConfidence: 0, action: 'score', priority: 70 },
    { id: 'INSUFFICIENT_AVAILABLE_BALANCE', name: 'Available balance', enabled: true, weight: 0, threshold: 0, minimumConfidence: 0, action: 'reject', priority: 1 },
    { id: 'EXISTING_ACCOUNT_RESTRICTION', name: 'Account restriction', enabled: true, weight: 0, threshold: 0, minimumConfidence: 0, action: 'reject', priority: 2 },
  ]
  return {
    version: 1,
    windowDays: 90,
    moderateAt: 25,
    highAt: 50,
    criticalAt: 75,
    lowHistoryAction: 'monitor',
    rules,
    updatedBy: 'system',
    updatedAt: now,
    reason: 'Initial demo policy.',
  }
}

export function publishPolicy(
  current: PolicyConfig,
  patch: Partial<Pick<PolicyConfig, 'windowDays' | 'moderateAt' | 'highAt' | 'criticalAt' | 'lowHistoryAction'>> & {
    rules?: RuleConfig[]
  },
  actorId: string,
  reason: string,
  now: string,
): PolicyConfig {
  if (!reason.trim()) throw new Error('A reason is required to publish a policy')
  const rules = patch.rules ?? current.rules
  for (const item of rules) {
    if (item.weight < 0 || item.weight > 100) throw new Error(`Invalid weight for ${item.id}`)
    if (item.threshold < 0) throw new Error(`Invalid threshold for ${item.id}`)
    if (MANDATORY.has(item.id) && !item.enabled) throw new Error(`${item.id} cannot be disabled`)
  }
  const moderateAt = patch.moderateAt ?? current.moderateAt
  const highAt = patch.highAt ?? current.highAt
  const criticalAt = patch.criticalAt ?? current.criticalAt
  if (!(moderateAt < highAt && highAt < criticalAt && criticalAt <= 100)) {
    throw new Error('Risk thresholds must increase and stay within 0–100')
  }
  return {
    ...current,
    ...patch,
    rules,
    version: current.version + 1,
    updatedBy: actorId,
    updatedAt: now,
    reason: reason.trim(),
  }
}
