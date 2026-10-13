/** Convert a major-unit amount (dollars, rupees) into integer minor units. */
export function toMinor(major: number): number {
  if (!Number.isFinite(major)) throw new Error('Amount must be a finite number')
  return Math.round(major * 100)
}

export function assertMinor(amountMinor: number) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Amount must be a positive integer in minor units')
  }
}
