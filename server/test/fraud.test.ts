import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TransactionControl } from '../src/control.ts'
import type { Actor } from '../src/domain.ts'

const analyst: Actor = { id: 'Maya Chen', role: 'analyst' }
const customer: Actor = { id: 'Samira Cole', role: 'customer' }
const admin: Actor = { id: 'admin', role: 'admin' }

const pkr = (rupees: number) => rupees * 100

function at(day: number, hour: number) {
  return `2026-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`
}

function seedNormal(control: TransactionControl, name: string, merchant: string, amount = 100_000) {
  for (let day = 1; day <= 12; day += 1) {
    control.recordHistory({
      customer: name,
      merchant,
      amountMinor: pkr(amount),
      createdAt: at(day, 10),
      reference: `${name}-hist-${day}`,
    })
  }
}

function seedRange(control: TransactionControl, name: string) {
  const amounts = [500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000]
  amounts.forEach((amount, index) => {
    control.recordHistory({
      customer: name,
      merchant: 'Known Merchant',
      amountMinor: pkr(amount),
      createdAt: at(index + 1, 10),
      reference: `${name}-range-a-${index}`,
    })
    control.recordHistory({
      customer: name,
      merchant: 'Known Merchant',
      amountMinor: pkr(amount),
      createdAt: at(index + 7, 10),
      reference: `${name}-range-b-${index}`,
    })
  })
}

describe('fraud control', () => {
  it('completes a transfer that matches history', async () => {
    const control = new TransactionControl()
    control.openAccount('Nadia Rahman', pkr(5_000_000))
    seedNormal(control, 'Nadia Rahman', 'Harbor & Co')
    const tx = await control.submitOutgoing({
      customer: 'Nadia Rahman',
      merchant: 'Harbor & Co',
      channel: 'wire',
      amountMinor: pkr(100_000),
      createdAt: at(20, 10),
      idempotencyKey: 'normal-1',
    })
    assert.equal(tx.lifecycle, 'COMPLETED')
    assert.equal(tx.action, 'allow')
  })

  it('holds an unusual nighttime amount', async () => {
    const control = new TransactionControl()
    control.openAccount('Avery Morgan', pkr(5_000_000))
    seedRange(control, 'Avery Morgan')
    const tx = await control.submitOutgoing({
      customer: 'Avery Morgan',
      merchant: 'New Night Beneficiary',
      channel: 'wire',
      amountMinor: pkr(1_500_000),
      createdAt: at(20, 2),
      idempotencyKey: 'night-1',
    })
    assert.equal(tx.lifecycle, 'ON_HOLD')
    assert.ok(tx.score >= 50)
    assert.equal(tx.lifecycle === 'COMPLETED', false)
  })

  it('links a recent incoming transfer without calling the pattern fraud', async () => {
    const control = new TransactionControl()
    control.openAccount('Elena Voss', pkr(300_000))
    seedRange(control, 'Elena Voss')
    control.recordIncoming({
      customer: 'Elena Voss',
      merchant: 'Payroll',
      amountMinor: pkr(1_600_000),
      createdAt: at(20, 1),
      reference: 'IN-1600',
    })
    const tx = await control.submitOutgoing({
      customer: 'Elena Voss',
      merchant: 'New Night Beneficiary',
      channel: 'wire',
      amountMinor: pkr(1_500_000),
      createdAt: at(20, 2),
      idempotencyKey: 'rapid-funds',
    })
    const assessment = control.snapshot().assessments.find((item) => item.transactionRef === tx.reference)
    assert.ok(assessment)
    assert.ok(assessment.sourceOfFunds.incomingReferences.includes('IN-1600'))
    assert.equal(assessment.sourceOfFunds.note.toLowerCase().includes('criminal'), false)
    assert.equal(assessment.rules.some((item) => item.explanation.toLowerCase().includes('criminal')), false)
  })

  it('rejects an overdraft even when behavior would score low', async () => {
    const control = new TransactionControl()
    control.openAccount('Jamie Rivers', pkr(50))
    seedNormal(control, 'Jamie Rivers', 'Bluebird Goods', 40)
    const tx = await control.submitOutgoing({
      customer: 'Jamie Rivers',
      merchant: 'Bluebird Goods',
      channel: 'wire',
      amountMinor: pkr(80),
      createdAt: at(20, 10),
      idempotencyKey: 'overdraft',
    })
    assert.equal(tx.lifecycle, 'REJECTED')
    assert.equal(tx.action, 'reject')
  })

  it('applies the low-history policy to a new customer', async () => {
    const control = new TransactionControl()
    control.openAccount('New Customer', pkr(1_000_000))
    const tx = await control.submitOutgoing({
      customer: 'New Customer',
      merchant: 'Northstar Market',
      channel: 'wire',
      amountMinor: pkr(10_000),
      createdAt: at(20, 10),
      idempotencyKey: 'new-account',
    })
    const assessment = control.snapshot().assessments.at(-1)
    assert.equal(assessment?.insufficientHistory, true)
    assert.equal(tx.action, 'monitor')
    assert.equal(tx.lifecycle, 'AWAITING_VERIFICATION')
  })

  it('does not treat a normal high amount to a known recipient as fraud', async () => {
    const control = new TransactionControl()
    control.openAccount('Chris Dalton', pkr(20_000_000))
    seedNormal(control, 'Chris Dalton', 'Juniper Digital', 900_000)
    const tx = await control.submitOutgoing({
      customer: 'Chris Dalton',
      merchant: 'Juniper Digital',
      channel: 'wire',
      amountMinor: pkr(900_000),
      createdAt: at(20, 10),
      idempotencyKey: 'known-beneficiary',
    })
    assert.equal(tx.lifecycle, 'COMPLETED')
    assert.equal(tx.reasons.some((reason) => reason.includes('upper range')), false)
  })

  it('refuses to execute a held transaction', async () => {
    const control = new TransactionControl()
    control.openAccount('Avery Morgan', pkr(5_000_000))
    seedRange(control, 'Avery Morgan')
    const tx = await control.submitOutgoing({
      customer: 'Avery Morgan',
      merchant: 'New Night Beneficiary',
      channel: 'wire',
      amountMinor: pkr(1_500_000),
      createdAt: at(21, 2),
      idempotencyKey: 'held-bypass',
    })
    assert.equal(tx.lifecycle, 'ON_HOLD')
    await assert.rejects(() => control.execute(tx.reference, analyst), /ON_HOLD/)
    assert.equal(control.snapshot().transactions.find((item) => item.reference === tx.reference)?.lifecycle, 'ON_HOLD')
  })

  it('returns the original transaction for a duplicate idempotency key', async () => {
    const control = new TransactionControl()
    control.openAccount('Nadia Rahman', pkr(5_000_000))
    seedNormal(control, 'Nadia Rahman', 'Harbor & Co')
    const first = await control.submitOutgoing({
      customer: 'Nadia Rahman',
      merchant: 'Harbor & Co',
      channel: 'wire',
      amountMinor: pkr(100_000),
      createdAt: at(20, 10),
      idempotencyKey: 'same-key',
    })
    const second = await control.submitOutgoing({
      customer: 'Nadia Rahman',
      merchant: 'Harbor & Co',
      channel: 'wire',
      amountMinor: pkr(100_000),
      createdAt: at(20, 10),
      idempotencyKey: 'same-key',
    })
    assert.equal(first.reference, second.reference)
    assert.equal(control.snapshot().transactions.filter((tx) => tx.idempotencyKey === 'same-key').length, 1)
  })

  it('prevents two transfers from spending the same balance', async () => {
    const control = new TransactionControl()
    control.openAccount('Owen Blake', pkr(1_000))
    seedNormal(control, 'Owen Blake', 'Lumen Supply', 800)
    const [first, second] = await Promise.all([
      control.submitOutgoing({
        customer: 'Owen Blake',
        merchant: 'Lumen Supply',
        channel: 'wire',
        amountMinor: pkr(800),
        createdAt: at(20, 10),
        idempotencyKey: 'concurrent-a',
      }),
      control.submitOutgoing({
        customer: 'Owen Blake',
        merchant: 'Lumen Supply',
        channel: 'wire',
        amountMinor: pkr(800),
        createdAt: at(20, 10),
        idempotencyKey: 'concurrent-b',
      }),
    ])
    const states = [first.lifecycle, second.lifecycle].sort()
    assert.deepEqual(states, ['COMPLETED', 'REJECTED'])
    const account = control.snapshot().accounts.find((item) => item.customer === 'Owen Blake')
    assert.equal(account?.availableMinor, pkr(200))
    assert.equal(account?.reservedMinor, 0)
  })

  it('audits and rejects an unauthorized hold release', async () => {
    const control = new TransactionControl()
    control.openAccount('Avery Morgan', pkr(5_000_000))
    seedRange(control, 'Avery Morgan')
    const tx = await control.submitOutgoing({
      customer: 'Avery Morgan',
      merchant: 'New Night Beneficiary',
      channel: 'wire',
      amountMinor: pkr(1_500_000),
      createdAt: at(22, 2),
      idempotencyKey: 'unauth',
    })
    await assert.rejects(() => control.approveHold(tx.reference, customer, 'please'), /Not allowed/)
    assert.equal(control.snapshot().audits.some((event) => event.action === 'approve-denied'), true)
    assert.equal(control.snapshot().transactions.find((item) => item.reference === tx.reference)?.lifecycle, 'ON_HOLD')
  })

  it('versions policy without rewriting an earlier assessment', async () => {
    const control = new TransactionControl()
    control.openAccount('Nadia Rahman', pkr(5_000_000))
    seedNormal(control, 'Nadia Rahman', 'Harbor & Co')
    const first = await control.submitOutgoing({
      customer: 'Nadia Rahman',
      merchant: 'Harbor & Co',
      channel: 'wire',
      amountMinor: pkr(100_000),
      createdAt: at(20, 10),
      idempotencyKey: 'before-policy',
    })
    const published = control.updatePolicy(
      admin,
      {
        rules: control.snapshot().policy.rules.map((item) =>
          item.id === 'HIGH_TRANSACTION_VELOCITY' ? { ...item, threshold: 2 } : item,
        ),
      },
      'Tighten the hourly velocity for the demo.',
    )
    assert.equal(published.version, 2)
    assert.equal(first.rulesetVersion, 1)
    const later = await control.submitOutgoing({
      customer: 'Nadia Rahman',
      merchant: 'Harbor & Co',
      channel: 'wire',
      amountMinor: pkr(100_000),
      createdAt: at(21, 10),
      idempotencyKey: 'after-policy',
    })
    assert.equal(later.rulesetVersion, 2)
    assert.equal(control.snapshot().assessments[0]?.rulesetVersion, 1)
  })

  it('releases a failed reservation once', async () => {
    const control = new TransactionControl()
    control.openAccount('Riley Chen', pkr(5_000_000))
    seedNormal(control, 'Riley Chen', 'Juniper Digital')
    control.failNextSettlement = true
    const tx = await control.submitOutgoing({
      customer: 'Riley Chen',
      merchant: 'Juniper Digital',
      channel: 'wire',
      amountMinor: pkr(100_000),
      createdAt: at(20, 10),
      idempotencyKey: 'fail-once',
    })
    assert.equal(tx.lifecycle, 'FAILED')
    const account = control.snapshot().accounts.find((item) => item.customer === 'Riley Chen')
    assert.equal(account?.availableMinor, pkr(5_000_000))
    assert.equal(account?.reservedMinor, 0)
    const releases = control.snapshot().transactions.filter((item) => item.reference === tx.reference && item.released)
    assert.equal(releases.length, 1)
  })
})
