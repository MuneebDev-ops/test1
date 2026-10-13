import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { ANALYST_NAME } from '../data/catalog'
import { buildSeed } from '../data/seed'
import { ensureHistory, gateBatch } from '../lib/gate'
import { generateTransactions } from '../lib/generate'
import type {
  AppData,
  CaseRecord,
  CaseStatus,
  Disposition,
  Scenario,
  Severity,
} from '../types'

const STORAGE_KEY = 'sentinelguard.demo.v1'

type Action =
  | { type: 'sign-in' }
  | { type: 'sign-out' }
  | { type: 'reset' }
  | { type: 'generate'; scenario: Scenario; seed: number; count: number }
  | { type: 'start-feed' }
  | { type: 'stop-feed' }
  | { type: 'feed-tick' }
  | { type: 'assign-alert'; id: string }
  | { type: 'dispose-alert'; id: string; disposition: Disposition }
  | {
      type: 'create-case'
      title: string
      severity: Severity
      reference: string
      notes: string
    }
  | {
      type: 'update-case'
      id: string
      owner: string
      notes: string
      outcome: string
      status: CaseStatus
    }
  | { type: 'save-rule'; id: string; enabled: boolean; threshold: number }
  | { type: 'apply-batch'; batch: ReturnType<typeof generateTransactions> }
  | { type: 'set-notice'; notice: string | null }
  | { type: 'apply-decision'; reference: string; lifecycle: string; reasons: string[] }

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false
  const data = value as AppData
  return (
    Array.isArray(data.transactions) &&
    Array.isArray(data.alerts) &&
    Array.isArray(data.cases) &&
    Array.isArray(data.rules) &&
    Array.isArray(data.events) &&
    Array.isArray(data.versions) &&
    typeof data.rulesetVersion === 'number' &&
    typeof data.signedIn === 'boolean' &&
    !!data.feed &&
    typeof data.feed.running === 'boolean'
  )
}

function readStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return buildSeed()
    const parsed: unknown = JSON.parse(raw)
    if (!isAppData(parsed)) return buildSeed()
    return parsed
  } catch {
    return buildSeed()
  }
}

function mergeGenerated(state: AppData, batch: ReturnType<typeof generateTransactions>): AppData {
  return {
    ...state,
    transactions: [...batch.transactions, ...state.transactions].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
    alerts: [...batch.alerts, ...state.alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    events: [...state.events, ...batch.events],
    lastRun: {
      references: batch.transactions.map((tx) => tx.reference),
      alerts: batch.alerts.length,
      at: new Date().toISOString(),
    },
  }
}

function nextCaseId(cases: CaseRecord[]) {
  const max = cases.reduce((highest, item) => {
    const match = /^CASE-(\d+)$/.exec(item.id)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0)
  return `CASE-${String(max + 1).padStart(4, '0')}`
}

function linkCase(state: AppData, created: CaseRecord): AppData {
  return {
    ...state,
    cases: [created, ...state.cases],
    alerts: state.alerts.map((alert) =>
      alert.reference === created.reference && !alert.caseId
        ? { ...alert, caseId: created.internalId }
        : alert,
    ),
  }
}

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'sign-in':
      return { ...state, signedIn: true }
    case 'sign-out':
      return { ...state, signedIn: false }
    case 'reset':
      return buildSeed()
    case 'generate': {
      if (!Number.isFinite(action.seed) || action.seed < 0 || !Number.isFinite(action.count)) return state
      const batch = generateTransactions({
        scenario: action.scenario,
        seed: action.seed,
        count: action.count,
        rules: state.rules,
        existing: state.transactions,
      })
      return mergeGenerated(state, batch)
    }
    case 'start-feed':
      return { ...state, feed: { ...state.feed, running: true, checked: true } }
    case 'stop-feed':
      return { ...state, feed: { ...state.feed, running: false, checked: true } }
    case 'feed-tick':
      return {
        ...state,
        feed: { ...state.feed, count: state.feed.count + 1, running: true, checked: true },
      }
    case 'assign-alert':
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert.id === action.id ? { ...alert, assignee: ANALYST_NAME } : alert,
        ),
      }
    case 'dispose-alert': {
      const current = state.alerts.find((alert) => alert.id === action.id)
      if (!current || current.status === 'resolved') return state
      let cases = state.cases
      let caseId = current.caseId
      if (action.disposition === 'analyst-confirmed') {
        const existing = cases.find((item) => item.internalId === caseId || item.reference === current.reference)
        if (existing) {
          caseId = existing.internalId
        } else {
          const created: CaseRecord = {
            id: nextCaseId(cases),
            internalId: crypto.randomUUID(),
            title: `High-signal review ${current.reference}`,
            severity: 'high',
            status: 'open',
            reference: current.reference,
            owner: ANALYST_NAME,
            notes: 'Opened from the alert queue. Heuristic signal only — not a validated financial decision.',
            outcome: '',
            createdAt: new Date().toISOString(),
          }
          cases = [created, ...cases]
          caseId = created.internalId
        }
      }
      return {
        ...state,
        cases,
        alerts: state.alerts.map((alert) =>
          alert.id === action.id
            ? {
                ...alert,
                status: 'resolved',
                disposition: action.disposition,
                assignee: alert.assignee ?? ANALYST_NAME,
                caseId,
              }
            : alert,
        ),
      }
    }
    case 'create-case': {
      const title = action.title.trim()
      if (!title || !action.reference) return state
      const created: CaseRecord = {
        id: nextCaseId(state.cases),
        internalId: crypto.randomUUID(),
        title,
        severity: action.severity,
        status: 'open',
        reference: action.reference,
        owner: ANALYST_NAME,
        notes: action.notes.trim(),
        outcome: '',
        createdAt: new Date().toISOString(),
      }
      return linkCase(state, created)
    }
    case 'update-case':
      return {
        ...state,
        cases: state.cases.map((item) =>
          item.id === action.id
            ? {
                ...item,
                owner: action.owner.trim() || item.owner,
                notes: action.notes,
                outcome: action.outcome,
                status: action.status,
              }
            : item,
        ),
      }
    case 'apply-batch':
      return { ...mergeGenerated(state, action.batch), notice: null }
    case 'apply-decision':
      return {
        ...state,
        transactions: state.transactions.map((tx) =>
          tx.reference === action.reference
            ? {
                ...tx,
                status: action.lifecycle === 'COMPLETED' ? 'completed' : 'review',
                reasons: action.reasons.length > 0 ? action.reasons : tx.reasons,
              }
            : tx,
        ),
      }
    case 'set-notice':
      return { ...state, notice: action.notice }
    case 'save-rule': {
      const rule = state.rules.find((item) => item.id === action.id)
      if (!rule) return state
      const version = state.rulesetVersion + 1
      const publishedAt = new Date().toISOString()
      const threshold =
        rule.unit === 'count' ? Math.max(1, Math.round(action.threshold)) : Math.max(0, action.threshold)
      return {
        ...state,
        rulesetVersion: version,
        rules: state.rules.map((item) =>
          item.id === action.id ? { ...item, enabled: action.enabled, threshold, updatedAt: publishedAt } : item,
        ),
        versions: [
          {
            version,
            publishedAt,
            summary: `${rule.name} saved. Threshold ${threshold}. ${action.enabled ? 'Enabled' : 'Disabled'}.`,
          },
          ...state.versions,
        ],
      }
    }
    default:
      return state
  }
}

interface StoreValue {
  data: AppData
  signIn: () => void
  signOut: () => void
  reset: () => void
  generate: (scenario: Scenario, seed: number, count: number) => void
  startFeed: () => void
  stopFeed: () => void
  assignAlert: (id: string) => void
  disposeAlert: (id: string, disposition: Disposition) => void
  createCase: (input: { title: string; severity: Severity; reference: string; notes: string }) => string | null
  updateCase: (input: { id: string; owner: string; notes: string; outcome: string; status: CaseStatus }) => void
  saveRule: (id: string, enabled: boolean, threshold: number) => void
}

const StoreContext = createContext<StoreValue | null>(null)

async function submitBatch(state: AppData, batch: ReturnType<typeof generateTransactions>, dispatch: (action: Action) => void) {
  try {
    await ensureHistory(state.transactions)
    const gated = await gateBatch(batch)
    dispatch({ type: 'apply-batch', batch: gated })
  } catch (error) {
    dispatch({
      type: 'set-notice',
      notice: error instanceof Error ? error.message : 'The fraud service is unavailable. The transfer was not completed.',
    })
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, null, () => readStorage())
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Demo persistence is best-effort.
    }
  }, [data])

  useEffect(() => {
    if (!data.feed.running) return
    const timer = window.setInterval(() => {
      const current = dataRef.current
      const nextCount = current.feed.count + 1
      const batch = generateTransactions({
        scenario: 'normal',
        seed: 41027 + nextCount,
        count: 1,
        rules: current.rules,
        existing: current.transactions,
      })
      dispatch({ type: 'feed-tick' })
      void submitBatch(current, batch, dispatch)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [data.feed.running])

  const api = useMemo<StoreValue>(() => {
    return {
      data,
      signIn: () => dispatch({ type: 'sign-in' }),
      signOut: () => dispatch({ type: 'sign-out' }),
      reset: () => dispatch({ type: 'reset' }),
      generate: (scenario, seed, count) => {
        const current = dataRef.current
        if (!Number.isFinite(seed) || seed < 0 || !Number.isFinite(count)) return
        const batch = generateTransactions({
          scenario,
          seed,
          count,
          rules: current.rules,
          existing: current.transactions,
        })
        void submitBatch(current, batch, dispatch)
      },
      startFeed: () => dispatch({ type: 'start-feed' }),
      stopFeed: () => dispatch({ type: 'stop-feed' }),
      assignAlert: (id) => dispatch({ type: 'assign-alert', id }),
      disposeAlert: (id, disposition) => {
        const alert = dataRef.current.alerts.find((item) => item.id === id)
        dispatch({ type: 'dispose-alert', id, disposition })
        if (!alert) return
        const path = disposition === 'legitimate' ? 'approve' : 'reject'
        void fetch(`/api/transactions/${encodeURIComponent(alert.reference)}/${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-demo-role': 'analyst',
            'x-demo-actor': ANALYST_NAME,
          },
          body: JSON.stringify({ reason: disposition }),
        })
          .then(async (response) => {
            if (!response.ok) return
            const body = (await response.json()) as { lifecycle?: string; reasons?: string[] }
            if (!body.lifecycle) return
            dispatch({
              type: 'apply-decision',
              reference: alert.reference,
              lifecycle: body.lifecycle,
              reasons: body.reasons ?? [],
            })
          })
          .catch(() => {
            // Seed records that were never submitted stay on the local disposition.
          })
      },
      createCase: (input) => {
        if (!input.title.trim() || !input.reference) return null
        const numeric = data.cases.reduce((highest, item) => {
          const match = /^CASE-(\d+)$/.exec(item.id)
          return match ? Math.max(highest, Number(match[1])) : highest
        }, 0)
        dispatch({ type: 'create-case', ...input })
        return `CASE-${String(numeric + 1).padStart(4, '0')}`
      },
      updateCase: (input) => dispatch({ type: 'update-case', ...input }),
      saveRule: (id, enabled, threshold) => dispatch({ type: 'save-rule', id, enabled, threshold }),
    }
  }, [data])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useApp() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useApp must be used within AppProvider')
  return store
}
