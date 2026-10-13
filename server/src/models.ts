import mongoose from 'mongoose'

const assessmentSchema = new mongoose.Schema(
  {
    transactionRef: { type: String, required: true, index: true },
    customer: { type: String, required: true },
    score: { type: Number, required: true },
    category: { type: String, required: true },
    action: { type: String, required: true },
    rulesetVersion: { type: Number, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
)

const auditSchema = new mongoose.Schema(
  {
    actor: String,
    role: String,
    action: String,
    transactionRef: String,
    previousState: String,
    newState: String,
    reason: String,
    rulesetVersion: Number,
    at: String,
  },
  { timestamps: false },
)

export const AssessmentModel = mongoose.models.FraudAssessment ?? mongoose.model('FraudAssessment', assessmentSchema)
export const AuditModel = mongoose.models.FraudAuditEvent ?? mongoose.model('FraudAuditEvent', auditSchema)

export async function connectMongo(uri: string) {
  await mongoose.connect(uri)
}
