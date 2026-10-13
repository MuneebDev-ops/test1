import { useState } from 'react'
import { Icon } from '../components/Icon'
import { PageHeader, eyebrowClass } from '../components/chrome'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { cn } from '../lib/utils'
import { useApp } from '../state/store'
import type { Scenario } from '../types'

const SCENARIOS: { id: Scenario; title: string; copy: string }[] = [
  { id: 'normal', title: 'Normal activity', copy: 'Generate a routine synthetic purchase.' },
  { id: 'suspicious', title: 'Suspicious activity', copy: 'Exercise higher-signal rule paths.' },
  { id: 'batch', title: 'Batch generation', copy: 'Generate a bounded group of records.' },
]

export function Simulator() {
  const { data, generate, startFeed, stopFeed, reset } = useApp()
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [seed, setSeed] = useState('41027')
  const [count, setCount] = useState('1')
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const parsedSeed = Number(seed)
  const parsedCount = Number(count)
  const feedLabel = !data.feed.checked ? 'FEED STATE UNKNOWN' : data.feed.running ? 'FEED RUNNING' : 'FEED STOPPED'

  function onGenerate() {
    if (!Number.isFinite(parsedSeed) || parsedSeed < 0) {
      setError('Enter a numeric seed.')
      return
    }
    if (!Number.isFinite(parsedCount) || parsedCount < 1 || parsedCount > 25) {
      setError('Record count must be between 1 and 25.')
      return
    }
    setError('')
    generate(scenario, parsedSeed, parsedCount)
  }

  return (
    <>
      <PageHeader
        eyebrow="Controlled data generation"
        title="Synthetic simulator"
        subtitle="Generate deterministic test activity and observe how it moves through the demo pipeline."
      >
        <span className={cn('inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold tracking-wide', data.feed.running && 'border-primary text-primary')}>
          {feedLabel}
        </span>
      </PageHeader>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className={eyebrowClass}>Scenario configuration</p>
              <h2 className="font-serif text-[28px] font-medium tracking-tight">Generate transactions</h2>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
              <Icon name="spark" />
            </span>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">Choose a scenario</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Choose a scenario">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={scenario === item.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-3 text-left',
                  scenario === item.id ? 'border-primary bg-accent' : 'border-border hover:border-[#c9d7d1]',
                )}
                onClick={() => setScenario(item.id)}
              >
                <span className={cn('size-4 rounded-full border-2', scenario === item.id ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]' : 'border-[#c5d0cb]')} />
                <span>
                  <strong className="block">{item.title}</strong>
                  <small className="text-muted-foreground">{item.copy}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seed">Seed</Label>
              <Input id="seed" value={seed} onChange={(event) => setSeed(event.target.value)} inputMode="numeric" />
              <span className="text-xs text-muted-foreground">Repeat a seed for deterministic results.</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="count">Record count</Label>
              <Input id="count" value={count} onChange={(event) => setCount(event.target.value)} inputMode="numeric" />
              <span className="text-xs text-muted-foreground">Batch maximum 25.</span>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          {data.notice ? <p className="mt-3 text-sm text-destructive">{data.notice}</p> : null}
          <Button className="mt-4 w-full" onClick={onGenerate}>
            <Icon name="play" /> {parsedCount > 1 || scenario === 'batch' ? 'Generate transactions' : 'Generate transaction'}
          </Button>
          {data.lastRun ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {`Wrote ${data.lastRun.references.length} record${data.lastRun.references.length === 1 ? '' : 's'}${
                data.lastRun.alerts
                  ? `, opened ${data.lastRun.alerts} alert${data.lastRun.alerts === 1 ? '' : 's'}`
                  : ''
              }. ${data.lastRun.references.slice(0, 3).join(', ')}${
                data.lastRun.references.length > 3 ? ` and ${data.lastRun.references.length - 3} more` : ''
              }`}
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className={eyebrowClass}>Deterministic feed</p>
              <h2 className="font-serif text-[28px] font-medium tracking-tight">Feed controls</h2>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
              <Icon name="pulse" />
            </span>
          </div>
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-muted p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-card text-primary">
              <Icon name="pulse" />
            </span>
            <div>
              <strong>
                {!data.feed.checked ? 'Feed state not checked' : data.feed.running ? 'Feed is running' : 'Feed is stopped'}
              </strong>
              <p className="text-sm text-muted-foreground">
                {!data.feed.checked
                  ? 'Start or stop the deterministic feed using the service controls.'
                  : data.feed.running
                    ? 'A routine synthetic record is written every few seconds.'
                    : 'Start the feed to append synthetic records.'}
              </p>
            </div>
          </div>
          {data.feed.running ? (
            <Button className="w-full" onClick={stopFeed}>
              <Icon name="stop" /> Stop feed
            </Button>
          ) : (
            <Button className="w-full" onClick={startFeed}>
              <Icon name="play" /> Start feed
            </Button>
          )}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#f3e4c8] bg-[#fff8ee] p-3.5 text-sm text-[#7d5a30]">
            <Icon name="warning" />
            <p>Feed output is synthetic and persists in this demo until reset.</p>
          </div>
          {confirmReset ? (
            <div className="mt-4 rounded-xl border border-border p-3">
              <p className="text-sm">Restore the original synthetic dataset? Generated records will be removed.</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    reset()
                    setConfirmReset(false)
                  }}
                >
                  Restore seed
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="mt-4" onClick={() => setConfirmReset(true)}>
              Reset demo data
            </Button>
          )}
        </Card>
      </section>
    </>
  )
}
