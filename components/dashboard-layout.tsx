"use client"

import type React from "react"
import { Sidebar, SidebarContext } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useContext, useState, useEffect } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

// DashboardLayout provides sidebar context and enforces layout structure
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Sidebar collapsed state is managed via context for consistency
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load collapsed state from localStorage on mount
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored !== null) {
      setCollapsed(stored === 'true')
    }
    setMounted(true)
  }, [])

  const handleSetCollapsed = (value: boolean) => {
    setCollapsed(value)
    localStorage.setItem('sidebar-collapsed', String(value))
  }

  if (!mounted) {
    // Fallback: render minimal layout with sidebar/header placeholders so skeletons are always inside layout
    return (
      <div className="flex min-h-screen">
        <div className="w-16 sm:w-64 bg-slate-100 dark:bg-slate-900/80 border-r border-slate-200 dark:border-slate-800 animate-pulse" />
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 animate-pulse" />
          <main className="flex-1 p-4 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-orange-950/30">
            {/* Children will be skeletons or loading UI */}
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Provide sidebar state via context for all children
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed: handleSetCollapsed }}>
      <div className="flex min-h-screen">
        <Sidebar />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarContext.Provider>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useContext(SidebarContext)
  const isMobile = useIsMobile()

  const fadeInUp = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  `

  return (
    <div 
      className="relative flex-1 transition-all duration-300 overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-orange-50/20 dark:from-slate-950 dark:via-slate-900/80 dark:to-slate-950"
      style={{
        marginLeft: isMobile ? '0px' : collapsed ? '80px' : '256px'
      }}>
      <style>{fadeInUp}</style>
      
      {/* Background gradient layers for visual depth */}
      <div 
        className="fixed inset-0 -z-10 h-full w-full pointer-events-none bg-gradient-to-br from-blue-100/10 via-orange-50/5 to-blue-50/10 dark:from-blue-950/30 dark:via-orange-950/10 dark:to-blue-950/20" 
        aria-hidden="true"
      />
      
      {/* Animated gradient accent in background */}
      <div 
        className="fixed inset-0 opacity-40 dark:opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(37, 99, 235, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 138, 0, 0.1) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />
      
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 overflow-auto px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
