import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[#146e5b]',
        outline: 'border border-border bg-card text-foreground hover:border-[#c9d7d1]',
        ghost: 'bg-transparent text-primary hover:bg-accent',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 px-3',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  )
}

export { Button, buttonVariants }
