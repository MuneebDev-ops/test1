import type { BehaviorProfile, DemoTransaction } from './domain.ts'

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index] ?? 0
}

export function buildProfile(
  customer: string,
  history: DemoTransaction[],
  at: string,
  windowDays: number,
): BehaviorProfile {
  const end = new Date(at).getTime()
  const start = end - windowDays * 24 * 60 * 60 * 1000
  const windowed = history.filter((tx) => {
    const time = new Date(tx.createdAt).getTime()
    return tx.customer === customer && time >= start && time <= end
  })
  const completed = windowed.filter((tx) => tx.direction === 'outgoing' && tx.lifecycle === 'COMPLETED')
  const amounts = completed.map((tx) => tx.amountMinor).sort((a, b) => a - b)
  const mid = median(amounts)
  const deviations = amounts.map((amount) => Math.abs(amount - mid)).sort((a, b) => a - b)
  const hourCounts = Array.from({ length: 24 }, () => 0)
  const recipientCounts: Record<string, number> = {}
  const dayTotals = new Map<string, number>()
  for (const tx of completed) {
    const when = new Date(tx.createdAt)
    hourCounts[when.getUTCHours()] = (hourCounts[when.getUTCHours()] ?? 0) + 1
    recipientCounts[tx.merchant] = (recipientCounts[tx.merchant] ?? 0) + 1
    const day = tx.createdAt.slice(0, 10)
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + tx.amountMinor)
  }
  const daily = [...dayTotals.values()]
  const confidenceBase = Math.min(completed.length / 20, windowDays >= 30 ? 1 : windowDays / 30)
  const confidence = Math.round(confidenceBase * 100) / 100
  return {
    customer,
    windowDays,
    transactionCount: windowed.length,
    completedOutgoingCount: completed.length,
    medianOutgoingMinor: mid,
    averageOutgoingMinor: amounts.length ? Math.round(amounts.reduce((sum, value) => sum + value, 0) / amounts.length) : 0,
    p90Minor: percentile(amounts, 90),
    p95Minor: percentile(amounts, 95),
    maxOutgoingMinor: amounts.at(-1) ?? 0,
    madMinor: median(deviations),
    typicalDailyOutgoingMinor: daily.length ? median([...daily].sort((a, b) => a - b)) : 0,
    hourCounts,
    recipientCounts,
    confidence,
    insufficientHistory: completed.length < 8,
    calculatedAt: at,
    version: 1,
  }
}
