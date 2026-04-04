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
  School,
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  MapPinned,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { createContext, useContext } from "react"
import { useAuth } from "@/lib/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"

export const SidebarContext = createContext<{ collapsed: boolean; setCollapsed: (v: boolean) => void }>({ collapsed: false, setCollapsed: () => {} })


const allNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", roles: ["admin", "teacher", "guidance"] },
  { icon: AlertTriangle, label: "Behavioral Events", href: "/behavioral-events", roles: ["teacher", "admin", "guidance"] },
  { icon: ClipboardCheck, label: "Guidance Review", href: "/guidance-review", roles: ["guidance"] },
  { icon: School, label: "Masterlist", href: "/masterlist", roles: ["admin", "guidance"] },
  { icon: ScanLine, label: "QR Scan & RFID Tap", href: "/scan", roles: ["teacher", "admin"] },
  { icon: CalendarDays, label: "Attendance Logs", href: "/attendance", roles: ["teacher", "admin"] },
  { icon: Users, label: "Students", href: "/students", roles: ["teacher", "admin", "guidance"] },
  { icon: MapPinned, label: "School Heatmap", href: "/school-heatmap", roles: ["teacher", "admin", "guidance"] },
  { icon: BarChart3, label: "Analytics", href: "/analytics", roles: ["admin", "guidance"] },
  { icon: Settings, label: "Settings", href: "/settings", roles: ["admin"] },
  // Parent dashboard nav item
  { icon: Users, label: "Parent Dashboard", href: "/parent", roles: ["parent"] },
  { icon: CalendarDays, label: "Attendance", href: "/parent-attendance", roles: ["parent"] },
  { icon: AlertTriangle, label: "Child's Activity", href: "/parent-behavior", roles: ["parent"] }
]

const mobilePrimaryHrefs = ["/", "/behavioral-events", "/students", "/scan", "/attendance"]

export function Sidebar() {
  const pathname = usePathname()
  // SidebarContext provides collapsed state for consistent sidebar behavior
  const { collapsed, setCollapsed } = useContext(SidebarContext)
  const { user } = useAuth()
  const isMobile = useIsMobile()

  // Filter nav items based on user role
  const navItems = user ? allNavItems.filter(item => item.roles.includes(user.role)) : []
  // For parent, show all parent pages in mobile nav
  let mobilePrimaryNavItems = navItems
  if (user && user.role === "parent") {
    mobilePrimaryNavItems = navItems.filter(item => ["/parent", "/parent-attendance", "/parent-behavior"].includes(item.href))
  } else {
    mobilePrimaryNavItems = navItems.filter((item) => mobilePrimaryHrefs.includes(item.href) || item.href === "/parent")
      .sort((a, b) => mobilePrimaryHrefs.indexOf(a.href) - mobilePrimaryHrefs.indexOf(b.href))
  }

  const getMobileLabel = (href: string, label: string) => {
    if (href === "/scan") return "QR & RFID"
    if (href === "/behavioral-events") return "Behavior"
    if (href === "/masterlist") return "Masterlist"
    return label
  }

  return (
    <>
        {/* Desktop sidebar */}
        <div
          className={cn(
            "hidden lg:flex fixed left-0 top-0 h-screen border-r transition-all duration-300 ease-out z-30 shadow-2xl flex-col bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#2563eb] dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 border-white/20 dark:border-slate-800/60",
            collapsed ? "w-20" : "w-64",
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
                  <p className="text-xs font-semibold text-white drop-shadow-sm">SafeGate v2.1</p>
                  <p className="text-xs text-[#fcd34d] dark:text-orange-400 mt-1">SGCDC Behavior and Intervention</p>
                </>
              )}
              {collapsed && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto" />
              )}
            </div>
          </div>
        </div>

        {/* Mobile bottom nav */}
        {isMobile && mobilePrimaryNavItems.length > 0 && (
          <nav className="fixed inset-x-2 bottom-2 z-40 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl lg:hidden flex justify-center">
            <div className={cn(
              `flex items-center justify-center gap-1 w-full px-2 py-2`
            )}>
              {mobilePrimaryNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex-1 min-w-0 flex flex-col items-center justify-center rounded-xl px-1.5 py-2 text-[10px] font-medium transition-all duration-200",
                      isActive
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className={cn("mb-1 h-4 w-4", isActive ? "scale-110" : "")} />
                    <span className="block w-full text-center leading-tight whitespace-normal wrap-break-word">{getMobileLabel(item.href, item.label)}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </>
  )
}
