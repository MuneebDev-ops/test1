import * as SelectPrimitive from '@radix-ui/react-select'
import type { ComponentProps } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/utils'

function Select({ ...props }: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectValue({ ...props }: ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <Icon name="chevron" className="rotate-90 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={6}
        className={cn(
          'z-[80] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-card shadow-lg',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[state=checked]:font-semibold',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
