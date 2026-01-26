"use client"

import { Bell, User, Sun, Moon, Home, Users as UsersIcon, ScanLine, BarChart3, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const currentTheme = mounted ? resolvedTheme : 'light'

  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return "Dashboard"
    const page = segments[0]
    return page.charAt(0).toUpperCase() + page.slice(1)
  }

  const getPageIcon = () => {
    const segments = pathname.split("/").filter(Boolean)
    const page = segments[0] || "dashboard"
    
    switch (page) {
      case "dashboard":
        return <Home size={18} />
      case "scan":
        return <ScanLine size={18} />
      case "students":
        return <UsersIcon size={18} />
      case "analytics":
        return <BarChart3 size={18} />
      case "settings":
        return <Settings size={18} />
      default:
        return <Home size={18} />
    }
  }

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-gradient-to-r from-card/95 via-card/90 to-card/85 border-b-2 border-primary/20 px-4 py-3 sm:px-6 lg:px-10 shadow-lg">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
            {getPageIcon()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{getPageTitle()}</h2>
            <p className="text-xs text-muted-foreground">SafeGate Attendance System</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
            className="rounded-full hover:bg-muted hover:scale-110 transition-all"
          >
            {currentTheme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted hover:scale-110 transition-all relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted hover:scale-110 transition-all"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
