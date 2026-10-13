import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
