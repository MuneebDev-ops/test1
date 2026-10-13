import type { ReactNode } from 'react'
import { Icon, type IconName } from '@/components/Icon'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export const eyebrowClass = 'mb-2 text-[11px] font-semibold tracking-[0.16em] text-[#8b98a1] uppercase'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-5">
      <div className="min-w-0 flex-1">
        <p className={eyebrowClass}>{eyebrow}</p>
        <h1 className="font-serif text-[46px] leading-none font-medium tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="pt-7">{children}</div> : null}
    </header>
  )
}

export function Pill({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'pink' | 'slate' | 'teal'
  className?: string
  children: ReactNode
}) {
  return (
    <Badge tone={tone} className={className}>
      {children}
    </Badge>
  )
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#f3e4c8] bg-[#fff8ee] p-3.5 leading-relaxed text-[#7d5a30]">
      <Icon name="warning" />
      <p>{children}</p>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-[13px] text-muted-foreground', className)}>
      {label}
      {children}
      {hint ? <span>{hint}</span> : null}
    </label>
  )
}

const iconTone = {
  teal: 'bg-accent text-primary',
  amber: 'bg-[#fff4e4] text-[#c9842a]',
  red: 'bg-[#fdeceb] text-destructive',
  slate: 'bg-[#eef2f4] text-[#60707a]',
}

export function Kpi({
  label,
  value,
  foot,
  icon,
  tone,
  compact = false,
}: {
  label: string
  value: ReactNode
  foot?: string
  icon: IconName
  tone: keyof typeof iconTone
  compact?: boolean
}) {
  return (
    <article className={cn('flex flex-col rounded-2xl border border-border bg-card p-4.5 shadow-sm', compact ? 'min-h-[108px]' : 'min-h-[132px]')}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{label}</span>
        <span className={cn('grid size-9 place-items-center rounded-xl', iconTone[tone])}>
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-2.5 font-serif text-[42px] leading-none">{value}</p>
      {foot ? <p className="mt-auto pt-3 text-sm text-muted-foreground">{foot}</p> : null}
    </article>
  )
}
