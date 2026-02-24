import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] dark:from-[#2563eb] dark:to-[#1e3a8a] text-white hover:from-[#1e3a8a] hover:to-[#1e3a8a] dark:hover:from-[#1e3a8a] dark:hover:to-[#2563eb] shadow-md hover:shadow-xl active:shadow-md transform hover:scale-105 active:scale-100',
        destructive:
          'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 focus-visible:ring-red-500/20 shadow-md hover:shadow-lg',
        outline:
          'border border-orange-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-xs hover:bg-orange-50 dark:hover:bg-[#ff8a00]/10 hover:text-orange-600 dark:hover:text-[#ff8a00] hover:border-orange-400 dark:hover:border-[#ff8a00]/50',
        secondary:
          'bg-gradient-to-r from-[#fbbf24] to-[#ff8a00] dark:from-[#ff8a00] dark:to-[#fbbf24] text-slate-900 dark:text-white hover:from-[#ff8a00] hover:to-[#fbbf24] dark:hover:from-[#fbbf24] dark:hover:to-[#ff8a00] shadow-md hover:shadow-xl active:shadow-md transform hover:scale-105 active:scale-100',
        ghost:
          'hover:bg-orange-100 dark:hover:bg-[#ff8a00]/10 hover:text-orange-700 dark:hover:text-[#ff8a00] rounded-lg',
        link: 'text-[#2563eb] dark:text-[#fbbf24] underline-offset-4 hover:underline hover:text-[#1e3a8a] dark:hover:text-[#ff8a00]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
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
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
