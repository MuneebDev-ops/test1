import type { Alert, AppData, CaseRecord, Channel, Disposition, Transaction } from '../types'
import { ANALYST_NAME, CHANNELS, CUSTOMERS, MERCHANTS } from './catalog'
import { pipelineFor } from '../lib/pipeline'
import { mulberry32, pick } from '../lib/prng'
import { riskFromScore } from '../lib/scoring'

const PUBLISHED = '2026-10-13T08:00:00'

const CASE_0001 = '32981aed-eec3-4475-abde-3c1d33d05b52'
const CASE_SIM = 'd70715dd-013f-46c1-81b3-d53484d66113'
const CASE_0003 = '6b1c0e44-9a21-4c55-8d10-2f4a91c0aa17'
const CASE_0002 = 'a93e70c1-55b4-4e2a-9c77-18d0b6e4f441'

interface Named {
  reference: string
  customer: string
  merchant: string
  channel: Channel
  amount: number
  createdAt: string
  score: number
  reasons: string[]
  alert?: {
    status: 'open' | 'resolved'
    disposition: Disposition | null
    assignee: string | null
    caseInternalId: string | null
  }
}

const NAMED: Named[] = [
  {
    reference: 'SG-SIM-11731-001',
    customer: 'Avery Morgan',
    merchant: 'Solstice Travel',
    channel: 'card_not_present',
    amount: 5273,
    createdAt: '2026-10-13T04:23:00',
    score: 80,
    reasons: ['High-value transaction', 'Card-not-present channel'],
    alert: {
      status: 'resolved',
      disposition: 'analyst-confirmed',
      assignee: ANALYST_NAME,
      caseInternalId: CASE_SIM,
    },
  },
  {
    reference: 'SG-DEMO-0048',
    customer: 'Jamie Rivers',
    merchant: 'Bluebird Goods',
    channel: 'wire',
    amount: 150.62,
    createdAt: '2026-10-13T04:22:00',
    score: 8,
    reasons: ['Baseline activity'],
  },
  {
    reference: 'SG-DEMO-0047',
    customer: 'Morgan Patel',
    merchant: 'Bluebird Goods',
    channel: 'card_not_present',
    amount: 17.01,
    createdAt: '2026-10-13T04:01:00',
    score: 32,
    reasons: ['Card-not-present channel'],
  },
  {
    reference: 'SG-DEMO-0041',
    customer: 'Avery Morgan',
    merchant: 'Northstar Market',
    channel: 'card_not_present',
    amount: 5167.96,
    createdAt: '2026-10-13T03:55:00',
    score: 80,
    reasons: ['High-value transaction', 'Card-not-present channel'],
    alert: {
      status: 'resolved',
      disposition: 'analyst-confirmed',
      assignee: ANALYST_NAME,
      caseInternalId: CASE_0001,
    },
  },
  {
    reference: 'SG-DEMO-0046',
    customer: 'Riley Chen',
    merchant: 'Juniper Digital',
    channel: 'mobile_wallet',
    amount: 494.92,
    createdAt: '2026-10-13T03:40:00',
    score: 8,
    reasons: ['Baseline activity'],
  },
  {
    reference: 'SG-DEMO-0045',
    customer: 'Nadia Rahman',
    merchant: 'Bluebird Goods',
    channel: 'card_present',
    amount: 32.31,
    createdAt: '2026-10-13T03:19:00',
    score: 8,
    reasons: ['Baseline activity'],
  },
  {
    reference: 'SG-DEMO-0028',
    customer: 'Samira Cole',
    merchant: 'Atlas Outdoor',
    channel: 'card_not_present',
    amount: 5888,
    createdAt: '2026-10-13T02:05:00',
    score: 80,
    reasons: ['High-value transaction', 'Card-not-present channel'],
    alert: { status: 'open', disposition: null, assignee: null, caseInternalId: null },
  },
  {
    reference: 'SG-DEMO-0033',
    customer: 'Elena Voss',
    merchant: 'Northstar Market',
    channel: 'card_not_present',
    amount: 6064.44,
    createdAt: '2026-10-12T23:07:00',
    score: 80,
    reasons: ['High-value transaction', 'Card-not-present channel'],
    alert: {
      status: 'resolved',
      disposition: 'legitimate',
      assignee: null,
      caseInternalId: CASE_0002,
    },
  },
  {
    reference: 'SG-DEMO-0025',
    customer: 'Chris Dalton',
    merchant: 'Juniper Digital',
    channel: 'mobile_wallet',
    amount: 7340.2,
    createdAt: '2026-10-12T19:22:00',
    score: 80,
    reasons: ['High-value transaction'],
    alert: {
      status: 'resolved',
      disposition: 'analyst-confirmed',
      assignee: 'Nadia Rahman',
      caseInternalId: CASE_0003,
    },
  },
  {
    reference: 'SG-DEMO-0038',
    customer: 'Priya Shah',
    merchant: 'Harbor & Co',
    channel: 'card_present',
    amount: 5420.18,
    createdAt: '2026-10-12T16:40:00',
    score: 80,
    reasons: ['High-value transaction'],
    alert: { status: 'open', disposition: null, assignee: null, caseInternalId: null },
  },
  {
    reference: 'SG-DEMO-0036',
    customer: 'Owen Blake',
    merchant: 'Lumen Supply',
    channel: 'wire',
    amount: 6102.5,
    createdAt: '2026-10-12T14:05:00',
    score: 80,
    reasons: ['High-value transaction'],
    alert: { status: 'open', disposition: null, assignee: null, caseInternalId: null },
  },
]

const FILLER: { day: string; count: number }[] = [
  { day: '2026-10-07', count: 2 },
  { day: '2026-10-08', count: 2 },
  { day: '2026-10-09', count: 2 },
  { day: '2026-10-10', count: 1 },
  { day: '2026-10-11', count: 2 },
  { day: '2026-10-12', count: 28 },
  { day: '2026-10-13', count: 1 },
]

function stamp(day: string, hour: number, minute: number) {
  return `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
}

function toTransaction(named: Named): Transaction {
  const risk = riskFromScore(named.score)
  return {
    id: `tx-${named.reference}`,
    reference: named.reference,
    customer: named.customer,
    merchant: named.merchant,
    channel: named.channel,
    amount: named.amount,
    status: risk === 'high' ? 'review' : 'completed',
    score: named.score,
    risk,
    createdAt: named.createdAt,
    reasons: named.reasons,
  }
}

function fillerTransactions(): Transaction[] {
  const reserved = new Set([25, 28, 33, 36, 38, 41, 45, 46, 47, 48])
  let number = 1
  const nextRef = () => {
    while (reserved.has(number)) number += 1
    if (number > 48) throw new Error('Ran out of demo references')
    const reference = `SG-DEMO-${String(number).padStart(4, '0')}`
    number += 1
    return reference
  }

  const rng = mulberry32(41027)
  const rows: Transaction[] = []
  let index = 0
  for (const slot of FILLER) {
    for (let offset = 0; offset < slot.count; offset += 1) {
      const channel = pick(rng, CHANNELS)
      const amount = Math.round((8 + rng() * 460) * 100) / 100
      const cardNotPresent = channel === 'card_not_present'
      const reference = nextRef()
      const createdAt =
        slot.day === '2026-10-13'
          ? stamp(slot.day, 1, 12)
          : stamp(slot.day, 8 + (index % 10), (index * 13) % 60)
      rows.push({
        id: `tx-${reference}`,
        reference,
        customer: pick(rng, CUSTOMERS),
        merchant: pick(rng, MERCHANTS),
        channel,
        amount,
        status: 'completed',
        score: cardNotPresent ? 32 : 8,
        risk: 'low',
        createdAt,
        reasons: cardNotPresent ? ['Card-not-present channel'] : ['Baseline activity'],
      })
      index += 1
    }
  }
  return rows
}

function cases(): CaseRecord[] {
  return [
    {
      id: 'CASE-0001',
      internalId: CASE_0001,
      title: 'Unusual high-value purchase sequence',
      severity: 'critical',
      status: 'closed',
      reference: 'SG-DEMO-0041',
      owner: ANALYST_NAME,
      notes: 'High-value purchases concentrated on one customer. Heuristic score 80.',
      outcome: 'Analyst-confirmed. Synthetic demo outcome only.',
      createdAt: '2026-10-13T04:10:00',
    },
    {
      id: 'CASE-21EA40A2',
      internalId: CASE_SIM,
      title: 'Verification follow-up SG-SIM-11731-001',
      severity: 'high',
      status: 'closed',
      reference: 'SG-SIM-11731-001',
      owner: ANALYST_NAME,
      notes: 'Simulator record crossed the high-value threshold on a card-not-present purchase.',
      outcome: 'Analyst-confirmed. Synthetic demo outcome only.',
      createdAt: '2026-10-13T04:30:00',
    },
    {
      id: 'CASE-0003',
      internalId: CASE_0003,
      title: 'Repeated high-value activity',
      severity: 'high',
      status: 'closed',
      reference: 'SG-DEMO-0025',
      owner: 'Nadia Rahman',
      notes: 'Customer accumulated high-value activity inside the demo window.',
      outcome: 'Analyst-confirmed. Synthetic demo outcome only.',
      createdAt: '2026-10-12T20:00:00',
    },
    {
      id: 'CASE-0002',
      internalId: CASE_0002,
      title: 'Digital purchase needs customer context',
      severity: 'high',
      status: 'closed',
      reference: 'SG-DEMO-0033',
      owner: ANALYST_NAME,
      notes: 'High amount with limited customer context. Reviewed against the demo rules.',
      outcome: 'Marked legitimate. Synthetic demo outcome only.',
      createdAt: '2026-10-12T23:20:00',
    },
  ]
}

function assertSeed(data: AppData) {
  const high = data.transactions.filter((tx) => tx.risk === 'high').length
  const low = data.transactions.filter((tx) => tx.risk === 'low').length
  const elevated = data.transactions.filter((tx) => tx.risk === 'elevated').length
  const open = data.alerts.filter((alert) => alert.status === 'open').length
  const confirmed = data.alerts.filter((alert) => alert.disposition === 'analyst-confirmed').length
  const refs = new Set(data.transactions.map((tx) => tx.reference))
  if (data.transactions.length !== 49 || refs.size !== 49) {
    throw new Error(`Expected 49 unique transactions, got ${data.transactions.length}`)
  }
  if (low !== 42 || elevated !== 0 || high !== 7) {
    throw new Error(`Risk mix ${low}/${elevated}/${high}`)
  }
  if (open !== 3 || confirmed !== 3 || data.cases.length !== 4) {
    throw new Error(`Alerts open ${open}, confirmed ${confirmed}, cases ${data.cases.length}`)
  }
  if (data.events.length !== 392) throw new Error(`Expected 392 events, got ${data.events.length}`)
}

export function buildSeed(): AppData {
  const transactions = [...NAMED.map(toTransaction), ...fillerTransactions()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  const alerts: Alert[] = NAMED.filter((row) => row.alert).map((row) => ({
    id: `al-${row.reference}`,
    transactionId: `tx-${row.reference}`,
    reference: row.reference,
    merchant: row.merchant,
    customer: row.customer,
    amount: row.amount,
    score: row.score,
    status: row.alert!.status,
    disposition: row.alert!.disposition,
    assignee: row.alert!.assignee,
    createdAt: row.createdAt,
    caseId: row.alert!.caseInternalId,
  }))
  alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const data: AppData = {
    signedIn: true,
    transactions,
    alerts,
    cases: cases(),
    rules: [
      {
        id: 'cnp',
        name: 'Card-not-present channel',
        description: 'Adds context to transactions made without the card being present.',
        enabled: true,
        threshold: 0,
        unit: 'amount',
        thresholdLabel: 'Amount threshold',
        updatedAt: PUBLISHED,
      },
      {
        id: 'high-value',
        name: 'High-value transaction',
        description: 'Flags transactions at or above the configured amount threshold.',
        enabled: true,
        threshold: 5000,
        unit: 'amount',
        thresholdLabel: 'Amount threshold',
        updatedAt: PUBLISHED,
      },
      {
        id: 'rapid',
        name: 'Rapid customer sequence',
        description: 'Flags a customer with three or more recent transactions in the last hour.',
        enabled: true,
        threshold: 3,
        unit: 'count',
        thresholdLabel: 'Transactions / hour',
        updatedAt: PUBLISHED,
      },
    ],
    rulesetVersion: 1,
    versions: [
      {
        version: 1,
        publishedAt: PUBLISHED,
        summary: 'Initial demo ruleset published.',
      },
    ],
    events: transactions.flatMap(pipelineFor),
    feed: { running: false, checked: false, count: 0 },
    lastRun: null,
  }
  assertSeed(data)
  return data
}
