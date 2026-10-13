import { useMemo } from 'react'
import { dayKey, formatDayLabel, greeting, reviewRate } from '../lib/format'
import { useApp } from '../state/store'
import { Icon } from '../components/Icon'
import { Kpi, PageHeader, Pill, eyebrowClass } from '../components/chrome'
import { Card } from '../components/ui/card'
import type { Alert, Transaction } from '../types'

function chartDays(transactions: Transaction[]) {
  const latest = transactions.reduce(
    (max, tx) => (tx.createdAt > max ? tx.createdAt : max),
    transactions[0]?.createdAt ?? new Date().toISOString(),
  )
  const end = new Date(latest)
  end.setHours(12, 0, 0, 0)
  const days: string[] = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(end)
    date.setDate(end.getDate() - offset)
    days.push(dayKey(date.toISOString()))
  }
  return days
}

function bucket(transactions: Transaction[], alerts: Alert[], day: string) {
  const alertByRef = new Map(alerts.map((alert) => [alert.reference, alert]))
  let routine = 0
  let suspected = 0
  let confirmed = 0
  for (const tx of transactions) {
    if (dayKey(tx.createdAt) !== day) continue
    const alert = alertByRef.get(tx.reference)
    if (alert?.disposition === 'analyst-confirmed') confirmed += 1
    else if (alert?.status === 'open') suspected += 1
    else routine += 1
  }
  return { routine, suspected, confirmed }
}

export function Overview() {
  const { data } = useApp()
  const stats = useMemo(() => {
    const total = data.transactions.length
    const high = data.transactions.filter((tx) => tx.risk === 'high').length
    const low = data.transactions.filter((tx) => tx.risk === 'low').length
    const elevated = data.transactions.filter((tx) => tx.risk === 'elevated').length
    const open = data.alerts.filter((alert) => alert.status === 'open').length
    const confirmed = data.alerts.filter((alert) => alert.disposition === 'analyst-confirmed').length
    const days = chartDays(data.transactions).map((day) => ({
      day,
      ...bucket(data.transactions, data.alerts, day),
    }))
    const max = Math.max(1, ...days.flatMap((day) => [day.routine, day.suspected, day.confirmed]))
    return { total, high, low, elevated, open, confirmed, days, max }
  }, [data.alerts, data.transactions])

  const mix = [
    { label: 'Low', value: stats.low, swatch: 'bg-signal', fill: 'bg-signal' },
    { label: 'Elevated', value: stats.elevated, swatch: 'bg-suspected', fill: 'bg-suspected' },
    { label: 'High', value: stats.high, swatch: 'bg-confirmed', fill: 'bg-confirmed' },
  ]
  const mixMax = Math.max(1, ...mix.map((item) => item.value))

  return (
    <>
      <PageHeader
        eyebrow="Stored-data monitor"
        title={`${greeting()}, operator.`}
        subtitle="A clear view of synthetic transaction activity and analyst workload."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
          <span className="size-2 rounded-full bg-signal" /> Data current
        </span>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Transactions" value={stats.total} foot="Stored records" icon="trend" tone="teal" />
        <Kpi label="High-risk flagged" value={stats.high} foot="Heuristic signal" icon="shield" tone="amber" />
        <Kpi label="Open alerts" value={stats.open} foot="Awaiting analyst" icon="bell" tone="red" />
        <Kpi label="Confirmed fraud" value={stats.confirmed} foot="Analyst outcome" icon="file" tone="slate" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <Card className="p-5">
          <p className={eyebrowClass}>Activity</p>
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="font-serif text-[28px] font-medium tracking-tight">Stored transaction volume</h2>
            <Pill tone="teal">{reviewRate(stats.high, stats.total)} review rate</Pill>
          </div>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-routine" /> Transactions</span>
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-suspected" /> Suspected</span>
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm bg-confirmed" /> Analyst-confirmed</span>
          </div>
          <div className="flex h-44 items-end gap-3" role="img" aria-label="Stored transaction volume by day">
            {stats.days.map((day) => (
              <div className="flex h-full flex-1 flex-col items-center" key={day.day}>
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <span
                    className="w-2.5 rounded-t bg-routine"
                    style={{ height: day.routine ? Math.max(6, (day.routine / stats.max) * 128) : 0 }}
                    title={`${day.routine} transactions`}
                  />
                  <span
                    className="w-2.5 rounded-t bg-suspected"
                    style={{ height: day.suspected ? Math.max(6, (day.suspected / stats.max) * 128) : 0 }}
                    title={`${day.suspected} suspected`}
                  />
                  <span
                    className="w-2.5 rounded-t bg-confirmed"
                    style={{ height: day.confirmed ? Math.max(6, (day.confirmed / stats.max) * 128) : 0 }}
                    title={`${day.confirmed} analyst-confirmed`}
                  />
                </div>
                <span className="pt-2 text-[11px] text-muted-foreground">{formatDayLabel(day.day)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className={eyebrowClass}>Signal distribution</p>
          <h2 className="mb-5 font-serif text-[28px] font-medium tracking-tight">Risk assessment mix</h2>
          <div className="flex flex-col gap-4">
            {mix.map((item) => (
              <div className="grid grid-cols-[88px_1fr_auto] items-center gap-3" key={item.label}>
                <span className="inline-flex items-center gap-2 text-sm">
                  <i className={`size-2.5 rounded-sm ${item.swatch}`} /> {item.label}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <span className={`block h-full rounded-full ${item.fill}`} style={{ width: `${(item.value / mixMax) * 100}%` }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-muted p-3.5 text-sm text-muted-foreground">
            <Icon name="shield" />
            <p>Risk labels are heuristic indicators, not validated financial decisions.</p>
          </div>
        </Card>
      </section>
    </>
  )
}
