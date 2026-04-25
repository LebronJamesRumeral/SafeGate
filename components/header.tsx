"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sun, Moon, Bell, Lock, User as UserIcon, LogOut, Settings, Calendar, AlertTriangle, BarChart3, ClipboardCheck, MapPinned, Megaphone } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { ensureFridayParentWeeklyCheckInNotification, fetchRoleNotifications, getUnreadCount, markRoleNotificationsAsRead, resolveRoleNotificationHref, RoleNotification } from "@/lib/role-notifications"

const mobilePrimaryHrefs = ["/", "/behavioral-events", "/students", "/scan", "/attendance"]

const headerNavItems = [
  { label: "Behavioral Events", href: "/behavioral-events", roles: ["teacher", "admin", "guidance"], icon: AlertTriangle },
  { label: "Guidance Review", href: "/guidance-review", roles: ["guidance"], icon: ClipboardCheck },
  { label: "School Heatmap", href: "/school-heatmap", roles: ["teacher", "admin", "guidance"], icon: MapPinned },
  { label: "Analytics", href: "/analytics", roles: ["admin"], icon: BarChart3 },
  { label: "School Events", href: "/events", roles: ["teacher", "admin"], icon: Megaphone },
  { label: "Settings", href: "/settings", roles: ["admin"], icon: Settings },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Teacher',
  guidance: 'Guidance Counselor',
  parent: 'Parent',
}

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [dateTime, setDateTime] = useState<string>("")
  const [roleNotifications, setRoleNotifications] = useState<RoleNotification[]>([])
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)

  const normalizedRole = (user?.role || '').toLowerCase()
  const unreadNotificationCount = getUnreadCount(normalizedRole, roleNotifications)

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !("Notification" in window)) {
      return
    }

    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch (error) {
        console.error('Notification permission request failed:', error)
      }
    }
  }, [])

  const showPushNotification = useCallback(async (notification: RoleNotification) => {
    if (typeof window === 'undefined' || !("Notification" in window)) {
      return
    }

    if (Notification.permission !== 'granted') {
      return
    }

    const href = resolveRoleNotificationHref(notification, normalizedRole)
    const preventionNote = typeof notification.meta?.prevention_note === 'string' ? notification.meta.prevention_note : ''
    const notificationBody = preventionNote
      ? `${notification.message}\nEarly prevention: ${preventionNote}`
      : notification.message

    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      if (registration) {
        await registration.showNotification(notification.title, {
          body: notificationBody,
          icon: '/logo.png',
          badge: '/logo.png',
          data: { href },
        })
      } else {
        const browserNotification = new Notification(notification.title, {
          body: notificationBody,
          icon: '/logo.png',
        })
        browserNotification.onclick = () => {
          window.focus()
          window.location.href = href
          browserNotification.close()
        }
      }
    } catch (error) {
      console.error('Failed to show push notification:', error)
    }
  }, [])

  const loadRoleNotifications = useCallback(async () => {
    if (!normalizedRole || !['teacher', 'admin', 'guidance', 'parent'].includes(normalizedRole)) {
      setRoleNotifications([])
      return
    }

    if (normalizedRole === 'parent') {
      await ensureFridayParentWeeklyCheckInNotification({
        id: user?.id || null,
        username: user?.username || null,
        fullName: user?.full_name || null,
        email: user?.username || null,
      })
    }

    const loadedNotifications = await fetchRoleNotifications(normalizedRole, 20, {
      id: user?.id || null,
      username: user?.username || null,
      fullName: user?.full_name || null,
      email: user?.username || null,
    })
    setRoleNotifications(loadedNotifications)

    if (loadedNotifications.length > 0) {
      const localStorageKey = `safegate_last_notified_role_notification_${normalizedRole}`
      const lastNotifiedId = Number(localStorage.getItem(localStorageKey) || '0')
      const newestUnread = loadedNotifications.find((item) => {
        const alreadyRead = (item.read_by_roles || []).includes(normalizedRole)
        return !alreadyRead && item.id > lastNotifiedId
      })

      if (newestUnread) {
        await showPushNotification(newestUnread)
        localStorage.setItem(localStorageKey, String(newestUnread.id))
      }
    }
  }, [normalizedRole, showPushNotification])

  const markAllRoleNotificationsAsRead = useCallback(async () => {
    if (!normalizedRole || roleNotifications.length === 0) {
      return
    }

    await markRoleNotificationsAsRead(normalizedRole, roleNotifications)
    await loadRoleNotifications()
  }, [loadRoleNotifications, normalizedRole, roleNotifications])

  const mobileOverflowItems = user
    ? headerNavItems.filter(
        (item) => item.roles.includes(user.role) && !mobilePrimaryHrefs.includes(item.href)
      )
    : []

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

  useEffect(() => {
    if (!mounted || !normalizedRole) {
      return
    }

    void loadRoleNotifications()
    const interval = setInterval(() => {
      void loadRoleNotifications()
    }, 15000)

    return () => clearInterval(interval)
  }, [loadRoleNotifications, mounted, normalizedRole])

  useEffect(() => {
    if (!notificationMenuOpen) {
      return
    }

    void markAllRoleNotificationsAsRead()
  }, [markAllRoleNotificationsAsRead, notificationMenuOpen])

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
      <div className="h-2 bg-linear-to-r from-[#1e3a8a] to-[#2563eb] dark:from-slate-900 dark:to-slate-800" />
      
      <header className="sticky top-2 z-20 backdrop-blur-lg px-4 py-3 sm:px-6 sm:py-4 shadow-md bg-white/97 dark:bg-slate-950/97 border-b border-orange-200/30 dark:border-slate-800/60 transition-all duration-300 ease-out">
        <div className="flex items-center justify-between">
          {/* Left side - Date/Time and Logo */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex flex-col gap-0.5">
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-[#1e3a8a] dark:text-orange-400 sm:h-5 sm:w-5" />
              <div className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 leading-tight truncate">
                {dateTime.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg text-[#1e3a8a] dark:text-orange-400 hover:bg-[#fbbf24]/20 dark:hover:bg-orange-500/10 hover:text-[#ff8a00] dark:hover:text-orange-300 transition-all duration-200 active:scale-95 h-9 w-9 sm:h-10 sm:w-10"
              title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Notifications */}
            <DropdownMenu
              open={notificationMenuOpen}
              onOpenChange={(open) => {
                setNotificationMenuOpen(open)
                if (open) {
                  void requestNotificationPermission()
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-[#2563eb] dark:text-orange-400 hover:bg-[#2563eb]/10 dark:hover:bg-orange-500/10 hover:text-[#1e3a8a] dark:hover:text-orange-300 transition-all duration-200 active:scale-95 relative h-9 w-9 sm:h-10 sm:w-10"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] leading-5 text-center rounded-full shadow-md">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl border border-slate-300/70 bg-white p-0 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {unreadNotificationCount > 0
                      ? `${unreadNotificationCount} unread update${unreadNotificationCount === 1 ? '' : 's'}`
                      : 'All caught up'}
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {roleNotifications.length === 0 && (
                    <div className="px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                      No notifications yet for your role.
                    </div>
                  )}
                  {roleNotifications.map((item) => {
                    const isUnread = !(item.read_by_roles || []).includes(normalizedRole)
                    const href = resolveRoleNotificationHref(item, normalizedRole)
                    const preventionNote = typeof item.meta?.prevention_note === 'string' ? item.meta.prevention_note : null

                    return (
                      <DropdownMenuItem
                        key={item.id}
                        asChild
                        className={cn(
                          "mx-2 mb-1 cursor-pointer rounded-xl px-3 py-2.5 transition-all duration-150 hover:bg-orange-100 dark:hover:bg-slate-800",
                          isUnread ? "bg-blue-50/70 dark:bg-blue-500/10" : ""
                        )}
                      >
                        <Link href={href}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start gap-2">
                              <span className={cn("mt-1 h-2 w-2 rounded-full", isUnread ? "bg-blue-500" : "bg-transparent")} />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-normal">{item.message}</p>
                                {preventionNote && (
                                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed whitespace-normal mt-1">
                                    Early prevention: {preventionNote}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="pl-4 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-gray-700 dark:text-slate-400 hover:bg-orange-100 dark:hover:bg-slate-800 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 active:scale-95 h-9 w-9 sm:h-10 sm:w-10"
                  title="User menu"
                >
                  <UserIcon className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 overflow-hidden rounded-2xl border border-slate-300/70 bg-white p-0 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {/* Prefer full name, then username/email */}
                  {user?.full_name?.trim() ? user.full_name : (user?.username || '')}
                </div>
                <div className="bg-slate-100 px-4 pb-3 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-400">
                  {ROLE_LABELS[(user?.role || '').toLowerCase()] || 'User'}
                </div>
                {mobileOverflowItems.length > 0 && (
                  <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:hidden">
                    More
                  </div>
                )}
                {mobileOverflowItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <DropdownMenuItem
                      key={item.href}
                      asChild
                      className={cn(
                        "mx-2 mb-1 cursor-pointer rounded-xl px-3 py-2 transition-all duration-150 hover:bg-orange-100 dark:hover:bg-slate-800 sm:hidden",
                        isActive ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300" : ""
                      )}
                    >
                      <Link href={item.href}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
                {mobileOverflowItems.length > 0 && <DropdownMenuSeparator className="my-1 sm:hidden dark:bg-slate-800" />}
                {normalizedRole === "admin" && (
                  <DropdownMenuItem asChild className="mx-2 hidden cursor-pointer rounded-xl px-3 py-2 transition-all duration-150 hover:bg-orange-100 dark:hover:bg-slate-800 sm:flex">
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="my-1 dark:bg-slate-800" />
                <DropdownMenuItem
                  className="mx-2 mb-2 cursor-pointer rounded-xl px-3 py-2 text-red-600 transition-all duration-150 hover:bg-red-100 dark:text-red-400 dark:hover:bg-slate-800"
                  onSelect={(event) => {
                    event.preventDefault()
                    logout()
                  }}
                >
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
