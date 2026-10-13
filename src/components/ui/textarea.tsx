import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
