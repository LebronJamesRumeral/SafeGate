import type React from "react"
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'SGCDC SafeGate - Behavioral Event Tracking and Intervention Platform',
  description: 'IoT-enabled SafeGate platform using ESP32 and RFID for behavioral event tracking, intervention planning, and attendance support at Subic Gateway Child Development Center, Inc.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SGCDC SafeGate',
  },
  applicationName: 'SGCDC SafeGate',
  icons: {
    icon: [
      {
        url: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        url: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-192x192.png',
        sizes: '96x96',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E3A8A',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SGCDC SafeGate" />
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <link rel="icon" href="/SGCDC.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" />
        <style>{`
          * {
            font-family: 'Century Gothic', 'Trebuchet MS', system-ui, -apple-system, sans-serif !important;
          }
          html, body {
            font-family: 'Century Gothic', 'Trebuchet MS', system-ui, -apple-system, sans-serif !important;
          }
        `}</style>
      </head>
      <body className="font-sans antialiased"
        suppressHydrationWarning
        key="body"
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
          <Analytics />
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
          }
        `}} />
      </body>
    </html>
  )
}
