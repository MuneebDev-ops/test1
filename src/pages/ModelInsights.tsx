import { Icon } from '../components/Icon'
import { PageHeader, Pill, eyebrowClass } from '../components/chrome'
import { Card } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import { useApp } from '../state/store'

export function ModelInsights() {
  const { data } = useApp()

  return (
    <>
      <PageHeader
        eyebrow="Transparency & limitations"
        title="Model insights"
        subtitle="Understand what powers the synthetic demo assessment and, just as importantly, what it does not establish."
      >
        <Pill tone="amber">Not a decision system</Pill>
      </PageHeader>

      <Card className="flex flex-wrap items-center justify-between gap-6 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
            <Icon name="model" />
          </span>
          <div>
            <p className={eyebrowClass}>Active heuristic profile</p>
            <h2 className="font-serif text-[28px] leading-none font-medium">heuristic_baseline</h2>
            <p className="mt-1 text-sm text-muted-foreground">Version heuristic-v1</p>
          </div>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <p>
            <span className="block text-xs text-muted-foreground">Inference status</span>
            <strong className="text-primary">Available — deterministic rule-based demo scoring</strong>
          </p>
          <p>
            <span className="block text-xs text-muted-foreground">Evaluation status</span>
            <strong className="text-[#a16207]">Not evaluated</strong>
          </p>
          <p>
            <span className="block text-xs text-muted-foreground">Ruleset</span>
            <strong>v{data.rulesetVersion}</strong>
          </p>
        </div>
      </Card>

      <div className="my-4 flex items-start gap-3 rounded-2xl border border-[#f3e4c8] bg-[#fff8ee] p-4 text-[#7d5a30]">
        <Icon name="warning" />
        <div>
          <strong>Scores are not validated financial risk decisions.</strong>
          <p className="mt-1 text-sm leading-relaxed">
            This is a synthetic-data-only demonstration of rule-based signals and investigation workflow. A score is
            neither a probability of fraud nor a recommendation to approve, decline, or block a transaction.
          </p>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className={eyebrowClass}>Inference</p>
              <h2 className="font-serif text-[28px] font-medium tracking-tight">How the demo operates</h2>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-[#eef2f4] text-[#60707a]">
              <Icon name="shield" />
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The heuristic_baseline profile evaluates configured demo rules and emits explainable reason codes. The
            result helps analysts inspect a synthetic scenario; it does not constitute a validated predictive model.
          </p>
          <dl className="mt-4">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-muted-foreground">Model type</dt>
              <dd>heuristic_baseline</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-muted-foreground">Version</dt>
              <dd>heuristic-v1</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-muted-foreground">Ruleset</dt>
              <dd>v{data.rulesetVersion}</dd>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-muted-foreground">Feature importance</dt>
              <dd>
                <Pill tone="slate">Not supported</Pill>
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5">
          <p className={eyebrowClass}>Data context</p>
          <h2 className="font-serif text-[28px] font-medium tracking-tight">Dataset description</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Seeded synthetic transaction scenarios generated for the SentinelGuard demo.</p>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted p-4">
            <span className="grid size-10 place-items-center rounded-full bg-sidebar font-serif text-lg text-white">S</span>
            <div>
              <strong>Synthetic records only</strong>
              <p className="text-sm text-muted-foreground">No real customer or payment information.</p>
            </div>
          </div>
        </Card>
      </section>
    </>
  )
}
