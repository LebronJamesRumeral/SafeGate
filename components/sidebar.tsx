"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  ScanLine, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  School
} from "lucide-react"
import { useState } from "react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: ScanLine, label: "Scan Attendance", href: "/scan" },
  { icon: Users, label: "Students", href: "/students" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-40 lg:hidden bg-primary text-primary-foreground p-2 rounded-lg shadow-lg hover:bg-primary/90 transition-all"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-card via-card to-card/95 border-r border-border/50 transition-transform duration-300 lg:translate-x-0 z-30 shadow-2xl backdrop-blur-xl",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center gap-3 border-b border-border/50 px-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <School className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">SafeGate</p>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Attendance</h1>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-sm">Live</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.02] hover:shadow-md",
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-xl" />
                )}
                <Icon size={20} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 p-4 bg-gradient-to-r from-muted/30 to-muted/10">
          <p className="text-xs text-muted-foreground">Admin Panel</p>
          <p className="text-sm font-semibold text-foreground mt-1">School Manager</p>
        </div>
      </div>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
