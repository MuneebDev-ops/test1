import { randomUUID } from 'node:crypto'
import type {
  Actor,
  Assessment,
  AuditEvent,
  DemoTransaction,
  InvestigationCase,
  LedgerPosting,
  PolicyConfig,
} from './domain.ts'
import { assessTransaction } from './engine.ts'
import { assertMinor } from './money.ts'
import { defaultPolicy, publishPolicy } from './policy.ts'
import { buildProfile } from './profile.ts'
import { investigateSource } from './sourceOfFunds.ts'

export class ControlError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function lifecycleFor(action: Assessment['action']): DemoTransaction['lifecycle'] {
  if (action === 'allow') return 'APPROVED_FOR_PROCESSING'
  if (action === 'monitor') return 'AWAITING_VERIFICATION'
  if (action === 'hold') return 'ON_HOLD'
  return 'REJECTED'
}

export class TransactionControl {
  private accounts = new Map<string, { customer: string; currency: string; availableMinor: number; reservedMinor: number; restricted: boolean }>()
  private transactions = new Map<string, DemoTransaction>()
  private byIdempotency = new Map<string, string>()
  private ledger: LedgerPosting[] = []
  private assessments: Assessment[] = []
  private cases: InvestigationCase[] = []
  private audits: AuditEvent[] = []
  private policyHistory: PolicyConfig[]
  private chain: Promise<unknown> = Promise.resolve()
  private policy: PolicyConfig
  failNextSettlement = false

  constructor(policy: PolicyConfig = defaultPolicy()) {
    this.policy = policy
    this.policyHistory = [policy]
  }

  private lock<T>(work: () => T): Promise<T> {
    const run = this.chain.then(() => work())
    this.chain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private audit(entry: Omit<AuditEvent, 'id' | 'at' | 'rulesetVersion'> & { at?: string }) {
    this.audits.push({
      id: randomUUID(),
      rulesetVersion: this.policy.version,
      at: entry.at ?? new Date().toISOString(),
      ...entry,
    })
  }

  openAccount(customer: string, availableMinor: number, currency = 'PKR') {
    if (!Number.isInteger(availableMinor) || availableMinor < 0) throw new ControlError('Invalid opening balance', 400)
    this.accounts.set(customer, { customer, currency, availableMinor, reservedMinor: 0, restricted: false })
    this.ledger.push({
      id: randomUUID(),
      accountId: customer,
      transactionRef: `opening-${customer}`,
      direction: 'in',
      amountMinor: availableMinor,
      kind: 'opening',
      createdAt: new Date().toISOString(),
    })
  }

  restrict(customer: string, restricted: boolean) {
    const account = this.accounts.get(customer)
    if (!account) throw new ControlError('Account not found', 404)
    account.restricted = restricted
  }

  snapshot() {
    return {
      policy: this.policy,
      policyHistory: [...this.policyHistory],
      transactions: [...this.transactions.values()],
      assessments: [...this.assessments],
      cases: [...this.cases],
      audits: [...this.audits],
      accounts: [...this.accounts.values()],
    }
  }

  submitOutgoing(input: {
    customer: string
    merchant: string
    channel: string
    amountMinor: number
    createdAt?: string
    idempotencyKey: string
    reference?: string
    currency?: string
  }): Promise<DemoTransaction> {
    return this.lock(() => this.submitOutgoingNow(input))
  }

  private submitOutgoingNow(input: {
    customer: string
    merchant: string
    channel: string
    amountMinor: number
    createdAt?: string
    idempotencyKey: string
    reference?: string
    currency?: string
  }): DemoTransaction {
    assertMinor(input.amountMinor)
    const existingRef = this.byIdempotency.get(input.idempotencyKey)
    if (existingRef) {
      const existing = this.transactions.get(existingRef)
      if (!existing) throw new ControlError('Stored idempotency key is missing', 500)
      return existing
    }
    const account = this.accounts.get(input.customer)
    if (!account) throw new ControlError('Account not found', 404)
    const createdAt = input.createdAt ?? new Date().toISOString()
    const reference = input.reference ?? `SG-LIVE-${this.transactions.size + 1}`
    const history = [...this.transactions.values()]
    const profile = buildProfile(input.customer, history, createdAt, this.policy.windowDays)
    const source = investigateSource({
      customer: input.customer,
      amountMinor: input.amountMinor,
      at: createdAt,
      history,
      ledger: this.ledger,
      lookbackHours: 6,
    })
    const assessment = assessTransaction({
      reference,
      customer: input.customer,
      merchant: input.merchant,
      amountMinor: input.amountMinor,
      createdAt,
      availableMinor: account.availableMinor,
      restricted: account.restricted,
      profile,
      recent: history,
      policy: this.policy,
      source,
    })
    this.assessments.push(assessment)
    const tx: DemoTransaction = {
      id: randomUUID(),
      reference,
      idempotencyKey: input.idempotencyKey,
      customer: input.customer,
      merchant: input.merchant,
      channel: input.channel,
      amountMinor: input.amountMinor,
      currency: input.currency ?? account.currency,
      direction: 'outgoing',
      lifecycle: 'PENDING_RISK_ASSESSMENT',
      createdAt,
      score: assessment.score,
      category: assessment.category,
      action: assessment.action,
      reasons: assessment.rules.map((item) => item.explanation),
      rulesetVersion: assessment.rulesetVersion,
      reservationMinor: 0,
      released: false,
    }
    tx.lifecycle = lifecycleFor(assessment.action)
    this.transactions.set(reference, tx)
    this.byIdempotency.set(input.idempotencyKey, reference)
    this.audit({
      actor: 'system',
      role: 'system',
      action: 'risk-assessed',
      transactionRef: reference,
      previousState: 'PENDING_RISK_ASSESSMENT',
      newState: tx.lifecycle,
      reason: assessment.rules.map((item) => item.id).join(', ') || 'no-rule',
      at: createdAt,
    })
    if (tx.lifecycle === 'ON_HOLD' || tx.lifecycle === 'AWAITING_VERIFICATION' || tx.lifecycle === 'REJECTED') {
      this.ensureCase(tx, assessment)
    }
    if (tx.lifecycle === 'APPROVED_FOR_PROCESSING') {
      return this.settleNow(tx)
    }
    return tx
  }

  recordIncoming(input: { customer: string; merchant: string; amountMinor: number; createdAt: string; reference: string }) {
    assertMinor(input.amountMinor)
    const account = this.accounts.get(input.customer)
    if (!account) throw new ControlError('Account not found', 404)
    if (this.transactions.has(input.reference)) throw new ControlError('Duplicate incoming reference', 409)
    const tx: DemoTransaction = {
      id: randomUUID(),
      reference: input.reference,
      idempotencyKey: `in-${input.reference}`,
      customer: input.customer,
      merchant: input.merchant,
      channel: 'incoming',
      amountMinor: input.amountMinor,
      currency: account.currency,
      direction: 'incoming',
      lifecycle: 'COMPLETED',
      createdAt: input.createdAt,
      score: 0,
      category: 'low',
      action: 'allow',
      reasons: ['Recorded incoming transfer'],
      rulesetVersion: this.policy.version,
      reservationMinor: 0,
      released: false,
    }
    account.availableMinor += input.amountMinor
    this.transactions.set(tx.reference, tx)
    this.ledger.push({
      id: randomUUID(),
      accountId: input.customer,
      transactionRef: input.reference,
      direction: 'in',
      amountMinor: input.amountMinor,
      kind: 'incoming',
      createdAt: input.createdAt,
    })
    return tx
  }

  /** Insert a completed outgoing record as prior history without passing the live gate. */
  recordHistory(input: { customer: string; merchant: string; amountMinor: number; createdAt: string; reference: string; channel?: string }) {
    assertMinor(input.amountMinor)
    if (!this.accounts.has(input.customer)) throw new ControlError('Account not found', 404)
    if (this.transactions.has(input.reference)) return this.transactions.get(input.reference) as DemoTransaction
    const tx: DemoTransaction = {
      id: randomUUID(),
      reference: input.reference,
      idempotencyKey: `hist-${input.reference}`,
      customer: input.customer,
      merchant: input.merchant,
      channel: input.channel ?? 'wire',
      amountMinor: input.amountMinor,
      currency: this.accounts.get(input.customer)?.currency ?? 'PKR',
      direction: 'outgoing',
      lifecycle: 'COMPLETED',
      createdAt: input.createdAt,
      score: 0,
      category: 'low',
      action: 'allow',
      reasons: ['Historical completed transfer'],
      rulesetVersion: this.policy.version,
      reservationMinor: 0,
      released: false,
    }
    this.transactions.set(referenceOf(tx), tx)
    return tx
  }

  execute(reference: string, actor: Actor): Promise<DemoTransaction> {
    return this.lock(() => {
      const tx = this.requireTx(reference)
      if (tx.lifecycle === 'COMPLETED') return tx
      if (tx.lifecycle !== 'APPROVED_FOR_PROCESSING') {
        this.audit({
          actor: actor.id,
          role: actor.role,
          action: 'execute-denied',
          transactionRef: reference,
          previousState: tx.lifecycle,
          newState: tx.lifecycle,
          reason: 'Transaction is not approved for processing',
        })
        throw new ControlError(`Cannot execute a transaction in ${tx.lifecycle}`, 409)
      }
      return this.settleNow(tx)
    })
  }

  approveHold(reference: string, actor: Actor, reason: string): Promise<DemoTransaction> {
    return this.lock(() => {
      this.requireReviewer(actor, 'approve-denied', reference)
      if (!reason.trim()) throw new ControlError('A reason is required', 400)
      const tx = this.requireTx(reference)
      if (tx.lifecycle !== 'ON_HOLD' && tx.lifecycle !== 'AWAITING_VERIFICATION') {
        throw new ControlError(`Cannot approve a transaction in ${tx.lifecycle}`, 409)
      }
      const previous = tx.lifecycle
      tx.lifecycle = 'APPROVED_FOR_PROCESSING'
      this.audit({
        actor: actor.id,
        role: actor.role,
        action: 'hold-approved',
        transactionRef: reference,
        previousState: previous,
        newState: tx.lifecycle,
        reason,
      })
      return this.settleNow(tx)
    })
  }

  rejectHold(reference: string, actor: Actor, reason: string): Promise<DemoTransaction> {
    return this.lock(() => {
      this.requireReviewer(actor, 'reject-denied', reference)
      if (!reason.trim()) throw new ControlError('A reason is required', 400)
      const tx = this.requireTx(reference)
      if (tx.lifecycle !== 'ON_HOLD' && tx.lifecycle !== 'AWAITING_VERIFICATION' && tx.lifecycle !== 'UNDER_REVIEW') {
        throw new ControlError(`Cannot reject a transaction in ${tx.lifecycle}`, 409)
      }
      const previous = tx.lifecycle
      tx.lifecycle = 'REJECTED'
      this.audit({
        actor: actor.id,
        role: actor.role,
        action: 'hold-rejected',
        transactionRef: reference,
        previousState: previous,
        newState: 'REJECTED',
        reason,
      })
      return tx
    })
  }

  updatePolicy(actor: Actor, patch: Parameters<typeof publishPolicy>[1], reason: string, now = new Date().toISOString()) {
    if (actor.role !== 'admin') {
      this.audit({
        actor: actor.id,
        role: actor.role,
        action: 'policy-denied',
        transactionRef: null,
        previousState: String(this.policy.version),
        newState: String(this.policy.version),
        reason: 'Only an administrator can publish policy',
      })
      throw new ControlError('Only an administrator can publish policy', 403)
    }
    const next = publishPolicy(this.policy, patch, actor.id, reason, now)
    this.policy = next
    this.policyHistory.push(next)
    this.audit({
      actor: actor.id,
      role: actor.role,
      action: 'policy-published',
      transactionRef: null,
      previousState: String(next.version - 1),
      newState: String(next.version),
      reason,
      at: now,
    })
    return next
  }

  private settleNow(tx: DemoTransaction): DemoTransaction {
    const account = this.accounts.get(tx.customer)
    if (!account) throw new ControlError('Account not found', 404)
    if (account.restricted) {
      tx.lifecycle = 'REJECTED'
      tx.reasons = [...tx.reasons, 'Account restriction blocked execution']
      return tx
    }
    if (account.availableMinor < tx.amountMinor) {
      tx.lifecycle = 'REJECTED'
      tx.action = 'reject'
      tx.category = 'critical'
      tx.reasons = [...tx.reasons, 'Available balance changed before execution']
      this.audit({
        actor: 'system',
        role: 'system',
        action: 'execution-rejected',
        transactionRef: tx.reference,
        previousState: 'APPROVED_FOR_PROCESSING',
        newState: 'REJECTED',
        reason: 'Insufficient available balance at execution',
      })
      return tx
    }
    const previous = tx.lifecycle
    account.availableMinor -= tx.amountMinor
    account.reservedMinor += tx.amountMinor
    tx.reservationMinor = tx.amountMinor
    tx.lifecycle = 'PROCESSING'
    this.ledger.push({
      id: randomUUID(),
      accountId: tx.customer,
      transactionRef: tx.reference,
      direction: 'out',
      amountMinor: tx.amountMinor,
      kind: 'reservation',
      createdAt: tx.createdAt,
    })
    if (this.failNextSettlement) {
      this.failNextSettlement = false
      this.releaseReservation(tx, 'FAILED')
      tx.lifecycle = 'FAILED'
      this.audit({
        actor: 'system',
        role: 'system',
        action: 'settlement-failed',
        transactionRef: tx.reference,
        previousState: 'PROCESSING',
        newState: 'FAILED',
        reason: 'Settlement failed after reservation',
      })
      return tx
    }
    account.reservedMinor -= tx.amountMinor
    tx.reservationMinor = 0
    tx.lifecycle = 'COMPLETED'
    this.ledger.push({
      id: randomUUID(),
      accountId: tx.customer,
      transactionRef: tx.reference,
      direction: 'out',
      amountMinor: tx.amountMinor,
      kind: 'settlement',
      createdAt: tx.createdAt,
    })
    this.audit({
      actor: 'system',
      role: 'system',
      action: 'settled',
      transactionRef: tx.reference,
      previousState: previous,
      newState: 'COMPLETED',
      reason: 'Balance reserved and settlement recorded',
    })
    return tx
  }

  private releaseReservation(tx: DemoTransaction, next: DemoTransaction['lifecycle']) {
    if (tx.released || tx.reservationMinor === 0) return
    const account = this.accounts.get(tx.customer)
    if (!account) throw new ControlError('Account not found', 404)
    account.availableMinor += tx.reservationMinor
    account.reservedMinor -= tx.reservationMinor
    this.ledger.push({
      id: randomUUID(),
      accountId: tx.customer,
      transactionRef: tx.reference,
      direction: 'in',
      amountMinor: tx.reservationMinor,
      kind: 'release',
      createdAt: new Date().toISOString(),
    })
    tx.reservationMinor = 0
    tx.released = true
    tx.lifecycle = next
  }

  private ensureCase(tx: DemoTransaction, assessment: Assessment) {
    if (this.cases.some((item) => item.transactionRef === tx.reference)) return
    const now = tx.createdAt
    this.cases.push({
      id: `CASE-${String(this.cases.length + 1).padStart(4, '0')}`,
      customer: tx.customer,
      transactionRef: tx.reference,
      score: assessment.score,
      category: assessment.category,
      status: 'open',
      assignee: null,
      notes: assessment.rules.map((item) => item.explanation).join(' '),
      resolution: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  private requireTx(reference: string) {
    const tx = this.transactions.get(reference)
    if (!tx) throw new ControlError('Transaction not found', 404)
    return tx
  }

  private requireReviewer(actor: Actor, action: string, reference: string) {
    if (actor.role === 'analyst' || actor.role === 'admin') return
    this.audit({
      actor: actor.id,
      role: actor.role,
      action,
      transactionRef: reference,
      previousState: null,
      newState: null,
      reason: 'Actor is not allowed to release or reject a held transaction',
    })
    throw new ControlError('Not allowed to change a held transaction', 403)
  }
}

function referenceOf(tx: DemoTransaction) {
  return tx.reference
}
