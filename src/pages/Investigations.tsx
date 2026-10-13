import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Field, Modal, PageHeader, Pill, eyebrowClass } from '../components/chrome'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { money } from '../lib/format'
import { cn } from '../lib/utils'
import { useApp } from '../state/store'
import type { CaseStatus, Severity } from '../types'

export function Investigations() {
  const { data, createCase, updateCase } = useApp()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<Severity>('high')
  const [reference, setReference] = useState(data.transactions[0]?.reference ?? '')
  const [draftNotes, setDraftNotes] = useState('')
  const [owner, setOwner] = useState('')
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState('')
  const [status, setStatus] = useState<CaseStatus>('open')
  const [saved, setSaved] = useState(false)

  const selected = data.cases.find((item) => item.id === params.get('case'))
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return data.cases
    return data.cases.filter((item) =>
      `${item.id} ${item.title} ${item.reference} ${item.owner}`.toLowerCase().includes(needle),
    )
  }, [data.cases, query])

  const [loadedId, setLoadedId] = useState<string | null>(null)
  if (selected && loadedId !== selected.id) {
    setLoadedId(selected.id)
    setOwner(selected.owner)
    setNotes(selected.notes)
    setOutcome(selected.outcome)
    setStatus(selected.status)
    setSaved(false)
  }

  const linked = selected ? data.transactions.find((tx) => tx.reference === selected.reference) : undefined

  function submitCase() {
    const id = createCase({ title, severity, reference, notes: draftNotes })
    if (!id) return
    setCreating(false)
    setTitle('')
    setDraftNotes('')
    setParams({ case: id })
  }

  return (
    <>
      <PageHeader
        eyebrow="Investigation workspace"
        title="Cases"
        subtitle="Keep ownership, analyst notes, and outcomes attached to the evidence."
      >
        <Button onClick={() => setCreating(true)}>
          <Icon name="plus" /> New case
        </Button>
      </PageHeader>

      <section className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className={eyebrowClass}>Case register</p>
              <strong>{visible.length} records</strong>
            </div>
            <div className="relative w-40">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find case"
                aria-label="Find case"
              />
            </div>
          </div>
          <div className="flex max-h-[640px] flex-col gap-2 overflow-auto">
            {visible.map((item) => (
              <button
                type="button"
                key={item.id}
                className={cn(
                  'rounded-xl border p-3 text-left',
                  item.id === selected?.id ? 'border-primary bg-accent' : 'border-border bg-card hover:border-[#c9d7d1]',
                )}
                onClick={() => setParams({ case: item.id })}
              >
                <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{item.id}</span>
                  <Pill tone={item.severity === 'critical' ? 'amber' : 'pink'}>{item.severity}</Pill>
                </span>
                <strong className="mt-1 block">{item.title}</strong>
                <span className="block text-sm text-muted-foreground">{item.reference}</span>
                <span className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <Pill tone={item.status === 'closed' ? 'slate' : 'green'}>{item.status}</Pill>
                  <span className="text-muted-foreground">{item.owner}</span>
                </span>
              </button>
            ))}
            {visible.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No cases match that search.</p> : null}
          </div>
        </Card>

        <Card className="p-5">
          {selected ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                updateCase({ id: selected.id, owner, notes, outcome, status })
                setSaved(true)
              }}
            >
              <p className={eyebrowClass}>{selected.id}</p>
              <h2 className="font-serif text-[28px] font-medium tracking-tight">{selected.title}</h2>
              <div className="flex flex-wrap gap-2">
                <Pill tone={selected.severity === 'critical' ? 'amber' : 'pink'}>{selected.severity}</Pill>
                <Pill tone="slate">{selected.reference}</Pill>
              </div>
              {linked ? (
                <Link className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 no-underline" to={`/transactions/${linked.reference}`}>
                  <span>
                    <strong className="block text-foreground">{linked.merchant}</strong>
                    <small className="text-muted-foreground">{linked.customer}</small>
                  </span>
                  <span className="text-foreground">{money(linked.amount)}</span>
                  <span className="text-foreground">Score {linked.score}</span>
                </Link>
              ) : null}
              <Field label="Owner">
                <Input value={owner} onChange={(event) => setOwner(event.target.value)} />
              </Field>
              <Field label="Notes">
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} />
              </Field>
              <Field label="Outcome">
                <Textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={3} />
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={(value) => setStatus(value as CaseStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit">Save case</Button>
                {saved ? <span className="text-sm text-primary">Saved to this demo.</span> : null}
              </div>
            </form>
          ) : (
            <div className="grid min-h-80 place-items-center text-center">
              <div>
                <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <Icon name="cases" />
                </span>
                <h2 className="font-serif text-[28px] font-medium">Select a case to investigate</h2>
                <p className="mt-2 mb-4 text-muted-foreground">Ownership, evidence notes, and outcome are managed together.</p>
                <Button variant="ghost" onClick={() => setCreating(true)}>
                  <Icon name="plus" /> Create a case
                </Button>
              </div>
            </div>
          )}
        </Card>
      </section>

      {creating ? (
        <Modal title="New case" onClose={() => setCreating(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitCase()
            }}
          >
            <Field label="Title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </Field>
            <Field label="Severity">
              <Select value={severity} onValueChange={(value) => setSeverity(value as Severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Transaction reference">
              <Select value={reference} onValueChange={setReference}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.transactions.map((tx) => (
                    <SelectItem key={tx.id} value={tx.reference}>
                      {tx.reference} · {tx.merchant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes">
              <Textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} rows={3} />
            </Field>
            <Button type="submit">Create case</Button>
          </form>
        </Modal>
      ) : null}
    </>
  )
}
