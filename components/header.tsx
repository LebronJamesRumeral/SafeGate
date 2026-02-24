"use client"

import { Sun, Moon, Bell, Lock, User as UserIcon, LogOut, Settings, Calendar } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"

export function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [dateTime, setDateTime] = useState<string>("")

  useEffect(() => {
    setMounted(true)
    // Format: "11:37 PM\nFriday, 6th February 2026"
    const updateDateTime = () => {
      const now = new Date()
      const time = now.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
      const date = now.toLocaleString('en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
      const ordinal = getOrdinal(now.getDate())
      setDateTime(`${time}\n${date.replace(now.getDate().toString(), ordinal)}`)
    }
    
    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const getOrdinal = (num: number) => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return num + "st"
    if (j === 2 && k !== 12) return num + "nd"
    if (j === 3 && k !== 13) return num + "rd"
    return num + "th"
  }

  const currentTheme = mounted ? resolvedTheme : 'light'

  return (
    <>
      {/* Blue top bar */}
      <div className="h-2 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] dark:from-slate-900 dark:to-slate-800" />
      
      <header className="sticky top-2 z-20 backdrop-blur-lg px-6 py-4 shadow-md bg-white/97 dark:bg-slate-950/97 border-b border-orange-200/30 dark:border-slate-800/60 transition-all duration-300 ease-out">
        <div className="flex items-center justify-between">
          {/* Left side - Date/Time and Logo */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col gap-0.5">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm p-1">
                <Image 
                  src="/SGCDC.png" 
                  alt="SGCDC Logo" 
                  width={40} 
                  height={40} 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#1e3a8a] dark:text-orange-400" />
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-tight">
                {dateTime.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg text-[#1e3a8a] dark:text-orange-400 hover:bg-[#fbbf24]/20 dark:hover:bg-orange-500/10 hover:text-[#ff8a00] dark:hover:text-orange-300 transition-all duration-200 active:scale-95"
              title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg text-[#2563eb] dark:text-orange-400 hover:bg-[#2563eb]/10 dark:hover:bg-orange-500/10 hover:text-[#1e3a8a] dark:hover:text-orange-300 transition-all duration-200 active:scale-95 relative"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-md" />
            </Button>

            {/* Lock/Settings */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg text-gray-700 dark:text-slate-400 hover:bg-yellow-100 dark:hover:bg-slate-800 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all duration-200 active:scale-95"
              title="Settings"
            >
              <Lock className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-gray-700 dark:text-slate-400 hover:bg-orange-100 dark:hover:bg-slate-800 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 active:scale-95"
                  title="User menu"
                >
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-lg shadow-lg border border-orange-200/30 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user?.full_name || user?.username}
                </div>
                <div className="px-3 pb-2 text-xs text-gray-600 dark:text-slate-400">
                  {user?.role === 'admin' ? 'Administrator' : 'User'}
                </div>
                <DropdownMenuSeparator className="dark:bg-slate-800" />
                <DropdownMenuItem className="cursor-pointer transition-all duration-150 hover:bg-orange-100 dark:hover:bg-slate-800">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-slate-800" />
                <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400 transition-all duration-150 hover:bg-red-100 dark:hover:bg-slate-800" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  )
}
