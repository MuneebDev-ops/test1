import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Banner, Modal, PageHeader } from '../components/chrome'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { formatShort, thresholdText } from '../lib/format'
import { useApp } from '../state/store'
import type { Rule } from '../types'

interface Draft {
  enabled: boolean
  threshold: string
}

function draftsFrom(rules: Rule[]): Record<string, Draft> {
  return Object.fromEntries(rules.map((rule) => [rule.id, { enabled: rule.enabled, threshold: String(rule.threshold) }]))
}

export function Rules() {
  const { data, saveRule } = useApp()
  const [drafts, setDrafts] = useState(() => draftsFrom(data.rules))
  const [editing, setEditing] = useState<string | null>(null)
  const [history, setHistory] = useState(false)
  const rulesKey = data.rules.map((rule) => `${rule.id}:${rule.enabled}:${rule.threshold}:${rule.updatedAt}`).join('|')
  const [snapshot, setSnapshot] = useState(rulesKey)
  if (snapshot !== rulesKey) {
    setSnapshot(rulesKey)
    setDrafts(draftsFrom(data.rules))
    setEditing(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Supported ruleset"
        title="Rule controls"
        subtitle="Tune enabled demo rules. Every save publishes a new ruleset version."
      >
        <Button variant="ghost" onClick={() => setHistory(true)}>
          <Icon name="file" /> Versioned changes
        </Button>
      </PageHeader>
      <Banner>
        Rules produce heuristic review signals for synthetic data. Threshold changes do not represent a validated
        financial policy.
      </Banner>

      <div className="flex flex-col gap-3">
        {data.rules.map((rule) => {
          const draft = drafts[rule.id] ?? { enabled: rule.enabled, threshold: String(rule.threshold) }
          const numeric = Number(draft.threshold)
          const invalid = !Number.isFinite(numeric) || numeric < 0
          const dirty = draft.enabled !== rule.enabled || numeric !== rule.threshold
          return (
            <Card className="grid items-center gap-4 p-4 lg:grid-cols-[minmax(0,1.4fr)_140px_180px_140px_160px]" key={rule.id}>
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <Icon name="sliders" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">{rule.name}</h2>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <strong>v{data.rulesetVersion}</strong>
                <small className="mt-1 block text-xs text-muted-foreground">Updated {formatShort(rule.updatedAt)}</small>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">{rule.thresholdLabel}</span>
                {editing === rule.id ? (
                  <Input
                    type="number"
                    min="0"
                    step={rule.unit === 'count' ? '1' : '0.01'}
                    value={draft.threshold}
                    aria-label={`${rule.name} threshold`}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [rule.id]: { ...draft, threshold: event.target.value },
                      }))
                    }
                  />
                ) : (
                  <strong>{thresholdText({ ...rule, threshold: invalid ? rule.threshold : numeric })}</strong>
                )}
                <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setEditing(editing === rule.id ? null : rule.id)}>
                  Edit threshold
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{draft.enabled ? 'Enabled' : 'Disabled'}</span>
                <Switch
                  checked={draft.enabled}
                  aria-label={`${rule.name} enabled`}
                  onCheckedChange={(checked) =>
                    setDrafts((current) => ({
                      ...current,
                      [rule.id]: { ...draft, enabled: checked },
                    }))
                  }
                />
              </div>
              <div className="text-right">
                <small className="block text-xs text-muted-foreground">Now save increments version</small>
                {dirty ? (
                  <Button className="mt-2" size="sm" disabled={invalid} onClick={() => saveRule(rule.id, draft.enabled, numeric)}>
                    Save
                  </Button>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>

      <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
        <Icon name="warning" /> Simulation notice — All records are synthetic. Risk scores are heuristic and are not
        validated financial risk decisions.
      </p>

      {history ? (
        <Modal title="Versioned changes" onClose={() => setHistory(false)}>
          <ol className="flex flex-col gap-3">
            {data.versions.map((version) => (
              <li key={version.version} className="rounded-xl border border-border p-3">
                <strong>v{version.version}</strong>
                <span className="ml-2 text-sm text-muted-foreground">{formatShort(version.publishedAt)}</span>
                <p className="mt-1 text-sm">{version.summary}</p>
              </li>
            ))}
          </ol>
        </Modal>
      ) : null}
    </>
  )
}
