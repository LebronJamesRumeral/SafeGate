'use client'

import { useToast } from '@/hooks/use-toast'
import { usePathname } from 'next/navigation'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  const viewportClassName = isLoginPage
    ? '!fixed !top-4 !right-4 !left-auto !bottom-auto z-[100] flex max-h-screen w-[calc(100vw-2rem)] max-w-md flex-col p-4 box-border sm:w-[calc(100vw-2rem)] sm:max-w-md'
    : 'fixed top-0 z-[100] flex max-h-screen inset-x-0 p-4 box-border flex-col-reverse sm:bottom-0 sm:right-0 sm:left-auto sm:top-auto sm:flex-col sm:w-full sm:max-w-[420px]'

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className={viewportClassName} />
    </ToastProvider>
  )
}
