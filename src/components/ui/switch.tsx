import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-[26px] w-11 shrink-0 items-center rounded-full bg-[#d5deda] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
