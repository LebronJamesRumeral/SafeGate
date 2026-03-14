import type React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const _geist = Inter({ 
  subsets: ["latin"],
  preload: false,
  fallback: ["system-ui", "sans-serif"],
})

const _geistMono = JetBrains_Mono({ 
  subsets: ["latin"],
  preload: false,
  fallback: ["monospace"],
})

export const metadata: Metadata = {
  title: 'SGCDC SafeGate - Student Attendance System',
  description: 'Subic Gateway Child Development Center - Modern student entry, exit, and attendance monitoring system',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SGCDC SafeGate",
  },
  applicationName: "SGCDC SafeGate",
  icons: {
    icon: [
      {
        url: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        url: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/logo.png',
        sizes: '96x96',
        type: 'image/png',
      },
    ],
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6B21A8',
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
        <link rel="icon" href="/SGCDC.png" type="image/png" />
        <link rel="apple-touch-icon" href="/SGCDC.png" sizes="180x180" />
      </head>
      <body className={`${_geist.className} ${_geistMono.className} font-sans antialiased`}
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
