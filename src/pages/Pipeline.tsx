import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Kpi, PageHeader, Pill, eyebrowClass } from '../components/chrome'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { formatWhen, stageLabel } from '../lib/format'
import { VOLUME_STAGES } from '../lib/pipeline'
import { useApp } from '../state/store'

export function Pipeline() {
  const { data } = useApp()
  const [seenAt, setSeenAt] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setSeenAt(new Date()), 15000)
    return () => window.clearInterval(timer)
  }, [])

  const recent = useMemo(
    () => [...data.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [data.events],
  )
  const stageCounts = VOLUME_STAGES.map((stage) => ({
    stage,
    count: data.events.filter((event) => event.stage === stage).length,
  }))
  const max = Math.max(1, ...stageCounts.map((stage) => stage.count))

  return (
    <>
      <PageHeader
        eyebrow="Persisted processing trace"
        title="Pipeline monitor"
        subtitle="Inspect stored stage counts and recent processing events. Refreshes automatically every 15 seconds."
      >
        <Button
          variant="ghost"
          title={`Last refresh ${formatWhen(seenAt.toISOString())}`}
          onClick={() => setSeenAt(new Date())}
        >
          <Icon name="refresh" /> Refresh
        </Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi compact label="Stage events" value={data.events.length} icon="pipeline" tone="teal" />
        <Kpi compact label="Rejected" value={0} icon="alert" tone="red" />
        <Kpi compact label="Failed" value={0} icon="warning" tone="amber" />
        <Kpi compact label="Retries" value={0} icon="refresh" tone="teal" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <p className={eyebrowClass}>Persisted stages</p>
          <h2 className="mb-5 font-serif text-[28px] font-medium tracking-tight">Processing volume</h2>
          <div className="flex flex-col gap-4">
            {stageCounts.map((stage) => (
              <div className="grid grid-cols-[160px_1fr_auto] items-center gap-3" key={stage.stage}>
                <span className="inline-flex items-center gap-2 text-sm">
                  <i className="size-2.5 rounded-sm bg-routine" /> {stageLabel(stage.stage)}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-signal" style={{ width: `${(stage.count / max) * 100}%` }} />
                </div>
                <strong>{stage.count}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className={eyebrowClass}>Event stream</p>
              <h2 className="font-serif text-[28px] font-medium tracking-tight">Recent pipeline events</h2>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-primary">
              <span className="size-2 rounded-full bg-signal" /> 15s refresh
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {recent.map((event) => (
              <article className="rounded-xl border border-border p-3" key={event.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <i className="size-2 rounded-full bg-signal" /> {event.stage}
                  </span>
                  <Pill tone="green">completed</Pill>
                  <span className="ml-auto text-xs text-muted-foreground">{event.durationMs} ms</span>
                </div>
                <p className="mt-1 text-sm font-medium">{event.reference}</p>
                <p className="text-sm text-muted-foreground">{event.message}</p>
                <time className="text-xs text-muted-foreground">{formatWhen(event.createdAt)}</time>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </>
  )
}
