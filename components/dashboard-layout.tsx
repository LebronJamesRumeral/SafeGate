import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground lg:pl-64 overflow-hidden">
      {/* Background gradient layer */}
      <div 
        className="fixed inset-0 -z-10 h-full w-full bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" 
        aria-hidden="true"
      />
      
      <Sidebar />
      
      <div className="flex min-h-screen flex-col backdrop-blur-sm bg-gradient-to-b from-background/85 to-background/95">
        <Header />
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-10 bg-gradient-to-b from-transparent via-background/20 to-primary/[0.02]">
          {children}
        </main>
      </div>
    </div>
  )
}
