import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Field, PageHeader, Pill, eyebrowClass } from '../components/chrome'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { CHANNELS } from '../data/catalog'
import { dayKey, formatWhen, money } from '../lib/format'
import { STAGES } from '../lib/pipeline'
import { useApp } from '../state/store'
import type { Channel, Risk, TxStatus } from '../types'

function riskTone(risk: Risk) {
  return risk === 'high' ? 'pink' : risk === 'elevated' ? 'amber' : 'green'
}

function riskBar(risk: Risk) {
  return risk === 'high' ? 'bg-confirmed' : risk === 'elevated' ? 'bg-suspected' : 'bg-signal'
}

export function Transactions() {
  const { data } = useApp()
  const { id } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [risk, setRisk] = useState<'all' | Risk>('all')
  const [status, setStatus] = useState<'all' | TxStatus>('all')
  const [channel, setChannel] = useState<'all' | Channel>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.transactions.filter((tx) => {
      if (needle && !`${tx.reference} ${tx.customer} ${tx.merchant}`.toLowerCase().includes(needle)) return false
      if (risk !== 'all' && tx.risk !== risk) return false
      if (status !== 'all' && tx.status !== status) return false
      if (channel !== 'all' && tx.channel !== channel) return false
      const day = dayKey(tx.createdAt)
      if (from && day < from) return false
      if (to && day > to) return false
      if (min !== '' && tx.amount < Number(min)) return false
      if (max !== '' && tx.amount > Number(max)) return false
      return true
    })
  }, [channel, data.transactions, from, max, min, query, risk, status, to])

  const selected = data.transactions.find((tx) => tx.reference === id)
  const history = selected
    ? data.events
        .filter((event) => event.transactionId === selected.id)
        .sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage))
    : []

  return (
    <>
      <PageHeader
        eyebrow="Transaction explorer"
        title="Transactions"
        subtitle="Search synthetic records, inspect heuristic signals, and follow pipeline history."
      >
        <span className="inline-flex h-10 items-center rounded-full border border-border bg-card px-3 text-sm">
          {filtered.length} records
        </span>
      </PageHeader>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reference, customer, merchant"
              aria-label="Search reference, customer, merchant"
            />
          </div>
          <Select value={risk} onValueChange={(value) => setRisk(value as 'all' | Risk)}>
            <SelectTrigger className="w-[210px]" aria-label="Risk signal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk signals</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="elevated">Elevated</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as 'all' | TxStatus)}>
            <SelectTrigger className="w-[210px]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="review">Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Channel">
            <Select value={channel} onValueChange={(value) => setChannel(value as 'all' | Channel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any channel</SelectItem>
                {CHANNELS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Field label="Minimum amount">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={min}
              onChange={(event) => setMin(event.target.value)}
            />
          </Field>
          <Field label="Maximum amount">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="No maximum"
              value={max}
              onChange={(event) => setMax(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Heuristic score</TableHead>
                <TableHead>Created</TableHead>
                <TableHead aria-label="Open" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <Link className="font-semibold no-underline" to={`/transactions/${tx.reference}`}>
                      {tx.reference}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{tx.customer}</span>
                  </TableCell>
                  <TableCell>
                    {tx.merchant}
                    <span className="block text-xs text-muted-foreground">{tx.channel}</span>
                  </TableCell>
                  <TableCell>{money(tx.amount)}</TableCell>
                  <TableCell>
                    <Pill tone={tx.status === 'review' ? 'amber' : 'green'}>{tx.status}</Pill>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <strong className={tx.risk === 'high' ? 'text-destructive' : undefined}>{tx.score}</strong>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e7eeeb]">
                        <span className={`block h-full rounded-full ${riskBar(tx.risk)}`} style={{ width: `${tx.score}%` }} />
                      </span>
                      <Pill tone={riskTone(tx.risk)}>{tx.risk}</Pill>
                    </div>
                  </TableCell>
                  <TableCell>{formatWhen(tx.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Inspect ${tx.reference}`}
                      onClick={() => navigate(`/transactions/${tx.reference}`)}
                    >
                      <Icon name="file" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 ? <p className="px-2 py-6 text-sm text-muted-foreground">No records match these filters.</p> : null}
        </div>
      </Card>

      <Dialog open={Boolean(id)} onOpenChange={(open) => { if (!open) navigate('/transactions') }}>
        <DialogContent side="right" aria-label="Transaction detail" aria-describedby={undefined}>
          <DialogHeader>
            <p className={eyebrowClass}>Transaction</p>
            <DialogTitle>{selected?.reference ?? id}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <Pill tone={selected.status === 'review' ? 'amber' : 'green'}>{selected.status}</Pill>
                <Pill tone={riskTone(selected.risk)}>{selected.risk}</Pill>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Customer</dt><dd>{selected.customer}</dd></div>
                <div><dt className="text-muted-foreground">Merchant</dt><dd>{selected.merchant}</dd></div>
                <div><dt className="text-muted-foreground">Channel</dt><dd>{selected.channel}</dd></div>
                <div><dt className="text-muted-foreground">Amount</dt><dd>{money(selected.amount)}</dd></div>
                <div><dt className="text-muted-foreground">Heuristic score</dt><dd>{selected.score} / 100</dd></div>
                <div><dt className="text-muted-foreground">Created</dt><dd>{formatWhen(selected.createdAt)}</dd></div>
              </dl>
              <h3 className="mt-5 mb-2 text-sm font-semibold">Reason codes</h3>
              <ul className="flex flex-col gap-2">
                {selected.reasons.map((reason) => (
                  <li key={reason} className="rounded-xl bg-muted px-3 py-2 text-sm">{reason}</li>
                ))}
              </ul>
              <h3 className="mt-5 mb-2 text-sm font-semibold">Pipeline history</h3>
              <ul className="flex flex-col gap-3">
                {history.map((event) => (
                  <li key={event.id} className="border-l-2 border-signal pl-3">
                    <span className="text-sm font-semibold">{event.stage}</span>
                    <small className="ml-2 text-muted-foreground">{event.durationMs} ms</small>
                    <p className="text-sm text-muted-foreground">{event.message}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">This reference is not in the stored demo records.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
