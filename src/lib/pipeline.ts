import type { PipelineEvent, Stage, Transaction } from '../types'

export const STAGES: Stage[] = [
  'INGESTED',
  'VALIDATED',
  'PERSISTED',
  'FEATURES_READY',
  'RULES_EVALUATED',
  'ML_SCORED',
  'DECISION_RECORDED',
  'COMPLETED',
]

export const VOLUME_STAGES: Stage[] = [
  'INGESTED',
  'VALIDATED',
  'PERSISTED',
  'FEATURES_READY',
  'RULES_EVALUATED',
  'ML_SCORED',
]

const DURATIONS = [8, 11, 13, 14, 16, 19, 22, 25]

export function pipelineFor(tx: Transaction): PipelineEvent[] {
  const start = new Date(tx.createdAt).getTime()
  return STAGES.map((stage, index) => ({
    id: `${tx.id}:${stage}`,
    transactionId: tx.id,
    reference: tx.reference,
    stage,
    status: 'completed',
    durationMs: DURATIONS[index] ?? 16,
    message:
      stage === 'ML_SCORED'
        ? 'Explicit heuristic baseline; not a trained or evaluated model'
        : 'Synthetic demo transaction processed',
    createdAt: new Date(start + index * 1000).toISOString(),
  }))
}
