import type { Rule } from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function money(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatWhen(iso: string) {
  const date = new Date(iso)
  const hours = date.getHours()
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  const hh = String(hour12).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${hh}:${mm} ${suffix}`
}

export function formatShort(iso: string) {
  const date = new Date(iso)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}/${date.getFullYear()}`
}

export function formatDayLabel(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year ?? 2026, (month ?? 1) - 1, date ?? 1).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function dayKey(iso: string) {
  const date = new Date(iso)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function reviewRate(high: number, total: number) {
  if (total === 0) return '0.0%'
  return `${((high / total) * 100).toFixed(1)}%`
}

export function thresholdText(rule: Rule) {
  if (rule.unit === 'amount') return money(rule.threshold)
  return `${rule.threshold} transactions / hour`
}

export function stageLabel(stage: string) {
  return stage.replaceAll('_', ' ')
}
