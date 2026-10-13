export type Role = 'admin' | 'analyst' | 'customer'

export type Lifecycle =
  | 'PENDING_RISK_ASSESSMENT'
  | 'APPROVED_FOR_PROCESSING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'AWAITING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED'

export type RiskCategory = 'low' | 'moderate' | 'high' | 'critical'
export type RecommendedAction = 'allow' | 'monitor' | 'hold' | 'reject'

export interface Actor {
  id: string
  role: Role
}

export interface RuleConfig {
  id: string
  name: string
  enabled: boolean
  weight: number
  threshold: number
  minimumConfidence: number
  action: 'score' | 'reject'
  priority: number
}

export interface PolicyConfig {
  version: number
  windowDays: number
  moderateAt: number
  highAt: number
  criticalAt: number
  lowHistoryAction: 'monitor' | 'allow'
  rules: RuleConfig[]
  updatedBy: string
  updatedAt: string
  reason: string
}

export interface LedgerPosting {
  id: string
  accountId: string
  transactionRef: string
  direction: 'in' | 'out'
  amountMinor: number
  kind: 'opening' | 'incoming' | 'outgoing' | 'reservation' | 'release' | 'settlement'
  createdAt: string
}

export interface Account {
  id: string
  customer: string
  currency: string
  availableMinor: number
  reservedMinor: number
  restricted: boolean
}

export interface DemoTransaction {
  id: string
  reference: string
  idempotencyKey: string
  customer: string
  merchant: string
  channel: string
  amountMinor: number
  currency: string
  direction: 'outgoing' | 'incoming'
  lifecycle: Lifecycle
  createdAt: string
  score: number
  category: RiskCategory
  action: RecommendedAction
  reasons: string[]
  rulesetVersion: number
  reservationMinor: number
  released: boolean
}

export interface TriggeredRule {
  id: string
  explanation: string
  evidence: string[]
  weight: number
}

export interface SourceFinding {
  status: 'supported' | 'incomplete' | 'not-required'
  incomingReferences: string[]
  note: string
}

export interface Assessment {
  transactionRef: string
  customer: string
  score: number
  category: RiskCategory
  action: RecommendedAction
  rules: TriggeredRule[]
  confidence: number
  insufficientHistory: boolean
  rulesetVersion: number
  sourceOfFunds: SourceFinding
  assessedAt: string
}

export interface InvestigationCase {
  id: string
  customer: string
  transactionRef: string
  score: number
  category: RiskCategory
  status: 'open' | 'closed'
  assignee: string | null
  notes: string
  resolution: string | null
  createdAt: string
  updatedAt: string
}

export interface AuditEvent {
  id: string
  actor: string
  role: Role | 'system'
  action: string
  transactionRef: string | null
  previousState: string | null
  newState: string | null
  reason: string
  rulesetVersion: number
  at: string
}

export interface BehaviorProfile {
  customer: string
  windowDays: number
  transactionCount: number
  completedOutgoingCount: number
  medianOutgoingMinor: number
  averageOutgoingMinor: number
  p90Minor: number
  p95Minor: number
  maxOutgoingMinor: number
  madMinor: number
  typicalDailyOutgoingMinor: number
  hourCounts: number[]
  recipientCounts: Record<string, number>
  confidence: number
  insufficientHistory: boolean
  calculatedAt: string
  version: number
}
