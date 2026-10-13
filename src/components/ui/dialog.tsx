import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentProps } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/utils'

function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50 bg-[#102028]/30', className)}
      {...props}
    />
  )
}

function keepSelectOpen(event: { target: EventTarget | null; preventDefault: () => void }) {
  const target = event.target
  if (target instanceof Element && target.closest('[data-slot="select-content"]')) {
    event.preventDefault()
  }
}

function DialogContent({
  className,
  children,
  side = 'center',
  onInteractOutside,
  onPointerDownOutside,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { side?: 'center' | 'right' }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={(event) => {
          keepSelectOpen(event)
          onInteractOutside?.(event)
        }}
        onPointerDownOutside={(event) => {
          keepSelectOpen(event)
          onPointerDownOutside?.(event)
        }}
        className={cn(
          'fixed z-50 bg-card shadow-xl outline-none',
          side === 'center' &&
            'top-1/2 left-1/2 max-h-[min(80vh,720px)] w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl border border-border p-6',
          side === 'right' && 'top-0 right-0 h-full w-[min(440px,100%)] overflow-auto border-l border-border p-6',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground" aria-label="Close">
          <Icon name="close" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('mb-4 pr-10', className)} {...props} />
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-serif text-[28px] font-medium tracking-tight', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description data-slot="dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger }
