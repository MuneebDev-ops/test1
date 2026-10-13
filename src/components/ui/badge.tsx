import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      tone: {
        neutral: 'bg-[#eef2f3] text-[#52616a]',
        green: 'bg-[#e6f7ee] text-[#1d8a5c]',
        amber: 'bg-[#fff4e4] text-[#a16207]',
        red: 'bg-[#fdeceb] text-[#d4544c]',
        pink: 'bg-[#fdecef] text-[#c4536a]',
        slate: 'bg-[#eef2f4] text-[#60707a]',
        teal: 'bg-accent text-accent-foreground',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
