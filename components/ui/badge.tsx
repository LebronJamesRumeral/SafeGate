import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-lg border px-3 py-1 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] dark:from-[#2563eb] dark:to-[#1e3a8a] text-white [a&]:hover:from-[#1e3a8a] [a&]:hover:to-[#1e3a8a] dark:[a&]:hover:from-[#1e3a8a] dark:[a&]:hover:to-[#2563eb] [a&]:hover:scale-105 [a&]:active:scale-95',
        secondary:
          'border-transparent bg-gradient-to-r from-[#fbbf24] to-[#ff8a00] dark:from-[#ff8a00] dark:to-[#fbbf24] text-slate-900 dark:text-white font-bold [a&]:hover:from-[#ff8a00] [a&]:hover:to-[#fbbf24] dark:[a&]:hover:from-[#fbbf24] dark:[a&]:hover:to-[#ff8a00] [a&]:hover:scale-105 [a&]:active:scale-95',
        destructive:
          'border-transparent bg-red-600 dark:bg-red-500 text-white [a&]:hover:bg-red-700 dark:[a&]:hover:bg-red-600 focus-visible:ring-red-500/20',
        outline:
          'text-slate-700 dark:text-slate-300 border-orange-300 dark:border-slate-600 [a&]:hover:bg-orange-50 dark:[a&]:hover:bg-[#ff8a00]/10 [a&]:hover:text-orange-600 dark:[a&]:hover:text-[#ff8a00]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
