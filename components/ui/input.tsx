import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-slate-900 dark:file:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-500 selection:bg-[#2563eb] selection:text-white border-orange-200 dark:border-slate-600 h-10 w-full min-w-0 rounded-lg border bg-white dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 px-4 py-2 text-base shadow-sm transition-all duration-200 outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-[#2563eb] dark:focus-visible:border-[#ff8a00] focus-visible:ring-[#2563eb]/20 dark:focus-visible:ring-[#ff8a00]/20 focus-visible:ring-[3px] focus-visible:shadow-md hover:border-orange-300 dark:hover:border-slate-500',
        'aria-invalid:ring-red-500/20 aria-invalid:border-red-500',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
