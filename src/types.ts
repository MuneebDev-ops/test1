export type Channel =
  | 'card_present'
  | 'card_not_present'
  | 'mobile_wallet'
  | 'wire'
  | 'ach'

export type Risk = 'low' | 'elevated' | 'high'
export type TxStatus = 'completed' | 'review'
export type AlertStatus = 'open' | 'resolved'
export type Disposition = 'analyst-confirmed' | 'legitimate'
export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type CaseStatus = 'open' | 'closed'

export type Stage =
  | 'INGESTED'
  | 'VALIDATED'
  | 'PERSISTED'
  | 'FEATURES_READY'
  | 'RULES_EVALUATED'
  | 'ML_SCORED'
  | 'DECISION_RECORDED'
  | 'COMPLETED'

export interface Transaction {
  id: string
  reference: string
  customer: string
  merchant: string
  channel: Channel
  amount: number
  status: TxStatus
  score: number
  risk: Risk
  createdAt: string
  reasons: string[]
}

export interface Alert {
  id: string
  transactionId: string
  reference: string
  merchant: string
  customer: string
  amount: number
  score: number
  status: AlertStatus
  disposition: Disposition | null
  assignee: string | null
  createdAt: string
  caseId: string | null
}

export interface CaseRecord {
  id: string
  internalId: string
  title: string
  severity: Severity
  status: CaseStatus
  reference: string
  owner: string
  notes: string
  outcome: string
  createdAt: string
}

export interface Rule {
  id: string
  name: string
  description: string
  enabled: boolean
  threshold: number
  unit: 'amount' | 'count'
  thresholdLabel: string
  updatedAt: string
}

export interface RulesetVersion {
  version: number
  publishedAt: string
  summary: string
}

export interface PipelineEvent {
  id: string
  transactionId: string
  reference: string
  stage: Stage
  status: 'completed'
  durationMs: number
  message: string
  createdAt: string
}

export interface FeedState {
  running: boolean
  checked: boolean
  count: number
}

export interface LastRun {
  references: string[]
  alerts: number
  at: string
}

export interface AppData {
  signedIn: boolean
  transactions: Transaction[]
  alerts: Alert[]
  cases: CaseRecord[]
  rules: Rule[]
  rulesetVersion: number
  versions: RulesetVersion[]
  events: PipelineEvent[]
  feed: FeedState
  lastRun: LastRun | null
  notice?: string | null
}

export type Scenario = 'normal' | 'suspicious' | 'batch'
