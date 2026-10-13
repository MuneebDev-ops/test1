import type { Assessment, BehaviorProfile, DemoTransaction, PolicyConfig, RiskCategory, RuleConfig, SourceFinding } from './domain.ts'

function rule(policy: PolicyConfig, id: string): RuleConfig | undefined {
  return policy.rules.find((item) => item.id === id)
}

function categoryFor(score: number, policy: PolicyConfig): RiskCategory {
  if (score >= policy.criticalAt) return 'critical'
  if (score >= policy.highAt) return 'high'
  if (score >= policy.moderateAt) return 'moderate'
  return 'low'
}

export function assessTransaction(input: {
  reference: string
  customer: string
  merchant: string
  amountMinor: number
  createdAt: string
  availableMinor: number
  restricted: boolean
  profile: BehaviorProfile
  recent: DemoTransaction[]
  policy: PolicyConfig
  source: SourceFinding
}): Assessment {
  const triggered: Assessment['rules'] = []
  const at = new Date(input.createdAt)
  const hour = at.getUTCHours()

  const balanceRule = rule(input.policy, 'INSUFFICIENT_AVAILABLE_BALANCE')
  if ((balanceRule?.enabled ?? true) && input.availableMinor < input.amountMinor) {
    triggered.push({
      id: 'INSUFFICIENT_AVAILABLE_BALANCE',
      weight: 0,
      evidence: [`available:${input.availableMinor}`, `requested:${input.amountMinor}`],
      explanation: 'Available balance, after reservations, is below the requested amount. Execution is not allowed.',
    })
  }

  const restriction = rule(input.policy, 'EXISTING_ACCOUNT_RESTRICTION')
  if ((restriction?.enabled ?? true) && input.restricted) {
    triggered.push({
      id: 'EXISTING_ACCOUNT_RESTRICTION',
      weight: 0,
      evidence: ['account:restricted'],
      explanation: 'The account has an existing restriction. Execution is not allowed.',
    })
  }

  const hardStop = triggered.some((item) => item.id === 'INSUFFICIENT_AVAILABLE_BALANCE' || item.id === 'EXISTING_ACCOUNT_RESTRICTION')

  if (!hardStop && !input.profile.insufficientHistory) {
    const amountRule = rule(input.policy, 'AMOUNT_DEVIATION')
    if (amountRule?.enabled && input.profile.confidence >= amountRule.minimumConfidence) {
      const spread = Math.max(input.profile.madMinor, Math.round(input.profile.medianOutgoingMinor * 0.25))
      const personalLimit = Math.max(input.profile.p95Minor, input.profile.medianOutgoingMinor + amountRule.threshold * spread)
      const knownRecipient = (input.profile.recipientCounts[input.merchant] ?? 0) >= 3
      const withinPersonalHistory = input.amountMinor <= personalLimit
      if (!(knownRecipient && withinPersonalHistory) && input.amountMinor > personalLimit) {
        triggered.push({
          id: 'AMOUNT_DEVIATION',
          weight: amountRule.weight,
          evidence: [`median:${input.profile.medianOutgoingMinor}`, `p95:${input.profile.p95Minor}`, `limit:${personalLimit}`],
          explanation: `Amount is above this customer's recent upper range (${personalLimit} minor units).`,
        })
      }
    }

    const hourRule = rule(input.policy, 'UNUSUAL_TRANSACTION_HOUR')
    if (hourRule?.enabled && input.profile.confidence >= hourRule.minimumConfidence && input.profile.completedOutgoingCount > 0) {
      const share = (input.profile.hourCounts[hour] ?? 0) / input.profile.completedOutgoingCount
      if ((input.profile.hourCounts[hour] ?? 0) === 0 && share < hourRule.threshold) {
        triggered.push({
          id: 'UNUSUAL_TRANSACTION_HOUR',
          weight: hourRule.weight,
          evidence: [`hour:${hour}`, `historicalCount:0`],
          explanation: `Hour ${hour} UTC has no completed outgoing history for this customer. Nighttime alone is not a fraud classification.`,
        })
      }
    }

    const velocity = rule(input.policy, 'HIGH_TRANSACTION_VELOCITY')
    if (velocity?.enabled) {
      const atMs = at.getTime()
      const outgoing = input.recent.filter((tx) => tx.customer === input.customer && tx.direction === 'outgoing' && tx.lifecycle !== 'FAILED' && tx.lifecycle !== 'REJECTED' && tx.lifecycle !== 'CANCELLED')
      const five = outgoing.filter((tx) => atMs - new Date(tx.createdAt).getTime() <= 5 * 60 * 1000).length
      const hourCount = outgoing.filter((tx) => atMs - new Date(tx.createdAt).getTime() <= 60 * 60 * 1000).length
      if (five + 1 >= velocity.threshold || hourCount + 1 >= velocity.threshold) {
        triggered.push({
          id: 'HIGH_TRANSACTION_VELOCITY',
          weight: velocity.weight,
          evidence: [`fiveMinute:${five}`, `hour:${hourCount}`],
          explanation: `Outgoing activity in the current hour reaches the configured velocity of ${velocity.threshold}.`,
        })
      }
    }

    const recipient = rule(input.policy, 'NEW_RECIPIENT')
    if (recipient?.enabled && (input.profile.recipientCounts[input.merchant] ?? 0) === 0) {
      triggered.push({
        id: 'NEW_RECIPIENT',
        weight: recipient.weight,
        evidence: [`merchant:${input.merchant}`],
        explanation: `${input.merchant} has no completed outgoing history for this customer.`,
      })
    }

    const rapid = rule(input.policy, 'RAPID_OUTGOING_AFTER_INCOMING')
    if (rapid?.enabled && input.source.incomingReferences.length > 0 && input.source.status === 'supported') {
      triggered.push({
        id: 'RAPID_OUTGOING_AFTER_INCOMING',
        weight: rapid.weight,
        evidence: input.source.incomingReferences.map((ref) => `incoming:${ref}`),
        explanation: `${input.source.note} Review the recorded incoming reference before releasing the transfer.`,
      })
    }
  }

  const scored = triggered.filter((item) => item.weight > 0)
  const grouped = scored.filter((item) => item.id === 'RAPID_OUTGOING_AFTER_INCOMING' || item.id === 'RECENT_UNEXPLAINED_FUNDS')
  const rest = scored.filter((item) => !grouped.includes(item))
  const groupedWeight = grouped.reduce((max, item) => Math.max(max, item.weight), 0)
  const score = Math.min(100, rest.reduce((sum, item) => sum + item.weight, 0) + groupedWeight)
  let action: Assessment['action'] = 'allow'
  let category = categoryFor(score, input.policy)
  if (hardStop) {
    action = 'reject'
    category = 'critical'
  } else if (input.profile.insufficientHistory) {
    action = input.policy.lowHistoryAction === 'monitor' ? 'monitor' : 'allow'
    category = 'low'
  } else if (category === 'critical') action = 'reject'
  else if (category === 'high') action = 'hold'
  else if (category === 'moderate') action = 'monitor'

  return {
    transactionRef: input.reference,
    customer: input.customer,
    score: hardStop ? 100 : score,
    category,
    action,
    rules: triggered,
    confidence: input.profile.confidence,
    insufficientHistory: input.profile.insufficientHistory,
    rulesetVersion: input.policy.version,
    sourceOfFunds: input.source,
    assessedAt: input.createdAt,
  }
}
