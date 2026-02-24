"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  ScanLine, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  School,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useContext, createContext } from "react"

export const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: false, setCollapsed: () => {} })

const allNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", roles: ["admin"] },
  { icon: School, label: "Masterlist", href: "/masterlist", roles: ["admin"] },
  { icon: ScanLine, label: "Scan Attendance", href: "/scan", roles: ["teacher", "admin"] },
  { icon: CalendarDays, label: "Attendance", href: "/attendance", roles: ["teacher", "admin"] },
  { icon: Users, label: "Students", href: "/students", roles: ["teacher", "admin"] },
  { icon: AlertTriangle, label: "Behavioral Events", href: "/behavioral-events", roles: ["teacher", "admin"] },
  { icon: BarChart3, label: "Analytics", href: "/analytics", roles: ["admin"] },
  { icon: Settings, label: "Settings", href: "/settings", roles: ["teacher", "admin"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  const { collapsed, setCollapsed } = useContext(SidebarContext)
  const { user } = useAuth()

  // Filter nav items based on user role
  const navItems = user ? allNavItems.filter(item => item.roles.includes(user.role)) : []

  return (
    <>
        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="fixed top-4 left-4 z-40 lg:hidden bg-gradient-to-r from-blue-700 to-blue-600 text-white p-2.5 rounded-lg shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar */}
        <div
          className={cn(
            "fixed left-0 top-0 h-screen border-r transition-all duration-300 ease-out lg:translate-x-0 z-30 shadow-2xl flex flex-col bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#2563eb] dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 border-white/20 dark:border-slate-800/60",
            collapsed ? "w-20 lg:w-20" : "w-64 lg:w-64",
            open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          {/* Logo */}
          <div className={cn(
            "h-20 flex items-center justify-between gap-3 border-b border-white/20 dark:border-slate-800/60 bg-white/10 dark:bg-slate-800/30 backdrop-blur-sm transition-all duration-300 ease-out",
            collapsed ? "px-2.5" : "px-6"
          )}>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 group shrink-0">
                <Image 
                  src="/SGCDC.png" 
                  alt="SGCDC Logo" 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform duration-300"
                  priority
                />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white drop-shadow-sm leading-tight">SGCDC</span>
                  <span className="text-xs text-[#fcd34d] dark:text-orange-400 font-semibold leading-tight">SafeGate</span>
                </div>
              )}
            </div>
            
            {/* Collapse Button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "hidden lg:flex items-center justify-center w-8 h-8 rounded-lg font-semibold transition-all duration-300 ease-out shrink-0 group shadow-sm hover:shadow-md",
                collapsed 
                  ? "bg-[#2563eb] hover:bg-[#1e3a8a] text-white active:scale-95" 
                  : "bg-white/20 hover:bg-white/30 text-white active:scale-95"
              )}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              ) : (
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setOpen(false)
                  }}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-sm transition-all duration-200 group relative overflow-hidden",
                    collapsed ? "justify-center" : "justify-start",
                    isActive
                      ? "bg-gradient-to-r from-[#ff8a00] to-[#fb923c] dark:from-orange-600 dark:to-orange-500 text-white shadow-lg hover:shadow-xl"
                      : "text-white/90 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-800/50 hover:text-[#fcd34d] dark:hover:text-orange-400"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                  <Icon className={cn(
                    "w-5 h-5 transition-all duration-200 relative z-10 shrink-0",
                    isActive ? "scale-110" : "group-hover:translate-x-0.5"
                  )} />
                  {!collapsed && (
                    <span className="relative z-10 truncate">{item.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className={cn(
            "border-t border-white/20 dark:border-slate-800/60 px-4 py-4 transition-all duration-300",
            collapsed ? "py-2" : "py-4"
          )}>
            <div className="bg-gradient-to-r from-[#fbbf24]/20 to-[#ff8a00]/20 dark:from-orange-500/20 dark:to-orange-600/20 hover:from-[#fbbf24]/30 hover:to-[#ff8a00]/30 dark:hover:from-orange-500/30 dark:hover:to-orange-600/30 rounded-lg p-3 text-center transition-all duration-300 backdrop-blur-sm">
              {!collapsed && (
                <>
                  <p className="text-xs font-semibold text-white drop-shadow-sm">SafeGate v1.1</p>
                  <p className="text-xs text-[#fcd34d] dark:text-orange-400 mt-1">SGCDC Attendance</p>
                </>
              )}
              {collapsed && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto" />
              )}
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {open && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </>
  )
}
