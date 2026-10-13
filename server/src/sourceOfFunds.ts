import type { DemoTransaction, LedgerPosting, SourceFinding } from './domain.ts'

export function investigateSource(input: {
  customer: string
  amountMinor: number
  at: string
  history: DemoTransaction[]
  ledger: LedgerPosting[]
  lookbackHours: number
}): SourceFinding {
  const at = new Date(input.at).getTime()
  const lookback = input.lookbackHours * 60 * 60 * 1000
  const incoming = input.history.filter((tx) => {
    if (tx.customer !== input.customer || tx.direction !== 'incoming' || tx.lifecycle !== 'COMPLETED') return false
    return at - new Date(tx.createdAt).getTime() <= lookback && at >= new Date(tx.createdAt).getTime()
  })
  const postings = input.ledger.filter((entry) => entry.accountId === input.customer)
  if (incoming.length === 0 && postings.length === 0) {
    return {
      status: 'incomplete',
      incomingReferences: [],
      note: 'No recorded incoming transfer explains this outgoing amount. The source of funds is incomplete, which is not itself a fraud finding.',
    }
  }
  const explained = incoming.filter((tx) => tx.amountMinor >= input.amountMinor)
  if (explained.length > 0) {
    return {
      status: 'supported',
      incomingReferences: explained.map((tx) => tx.reference),
      note: `Recorded incoming transfer ${explained.map((tx) => tx.reference).join(', ')} is large enough to explain the requested outgoing amount. The pattern is not labeled fraud by itself.`,
    }
  }
  if (incoming.length > 0) {
    return {
      status: 'supported',
      incomingReferences: incoming.map((tx) => tx.reference),
      note: `Recent incoming transfers ${incoming.map((tx) => tx.reference).join(', ')} were found. They do not fully cover this outgoing amount. The remainder is unexplained, not classified as criminal activity.`,
    }
  }
  return {
    status: 'incomplete',
    incomingReferences: [],
    note: 'Ledger postings exist, but no settled incoming transfer in the lookback window supports this outgoing amount.',
  }
}
