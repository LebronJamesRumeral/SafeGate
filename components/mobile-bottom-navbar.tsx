'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
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
  Megaphone,
  Menu,
  X,
  Home,
} from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  roles: string[];
  subItems?: NavItem[];
}

const allNavItems: NavItem[] = [
  {
    icon: <LayoutDashboard size={18} />,
    label: 'Dashboard',
    href: '/',
    roles: ['admin', 'teacher', 'guidance'],
  },
  {
    icon: <AlertTriangle size={18} />,
    label: 'Behavioral Events',
    href: '/behavioral-events',
    roles: ['teacher', 'admin', 'guidance'],
  },
  {
    icon: <ClipboardCheck size={18} />,
    label: 'Guidance Review',
    href: '/guidance-review',
    roles: ['guidance'],
  },
  {
    icon: <CalendarDays size={18} />,
    label: 'Attendance Logs',
    href: '/attendance',
    roles: ['teacher', 'admin'],
  },
  {
    icon: <School size={18} />,
    label: 'Masterlist',
    href: '/masterlist',
    roles: ['admin', 'guidance'],
  },
  {
    icon: <Users size={18} />,
    label: 'Students',
    href: '/students',
    roles: ['teacher', 'admin', 'guidance'],
  },
  {
    icon: <MapPinned size={18} />,
    label: 'School Heatmap',
    href: '/school-heatmap',
    roles: ['teacher', 'admin', 'guidance'],
  },
  {
    icon: <BarChart3 size={18} />,
    label: 'Analytics',
    href: '/analytics',
    roles: ['admin', 'guidance'],
  },
  {
    icon: <Megaphone size={18} />,
    label: 'School Events',
    href: '/events',
    roles: ['teacher', 'admin'],
  },
  // Parent role items
  {
    icon: <LayoutDashboard size={18} />,
    label: 'Parent Dashboard',
    href: '/parent',
    roles: ['parent'],
  },
  {
    icon: <CalendarDays size={18} />,
    label: 'Attendance',
    href: '/parent-attendance',
    roles: ['parent'],
  },
  {
    icon: <AlertTriangle size={18} />,
    label: "Child's Activity",
    href: '/parent-behavior',
    roles: ['parent'],
  },
  {
    icon: <Megaphone size={18} />,
    label: 'Announcement/Advisory',
    href: '/parent-announcement',
    roles: ['parent'],
  },
];

export function MobileBottomNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter items based on user role
  const filteredItems = user
    ? allNavItems.filter((item) => item.roles.includes(user.role))
    : [];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Close menu on navigation
  const handleNavigation = () => {
    setIsMenuOpen(false);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const isDashboard = pathname === '/';
  const isQRScan = pathname === '/scan';

  return (
    <>
      {/* Mobile Bottom Navigation Bar - only visible on mobile (md:hidden) */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 md:hidden w-11/12 max-w-2xl">
        {/* Backdrop overlay when menu is open (covers whole screen; navbar is higher z-index) */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 dark:bg-black/50 animate-fade-in md:hidden z-30"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Floating Popup Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-11/12 max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 z-50 animate-slide-up-in"
          >
            {/* Popup Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Navigation
              </h3>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Popup Menu Items */}
            <nav className="max-h-96 overflow-y-auto scrollbar-hide py-2">
              {filteredItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavigation}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200',
                    pathname === item.href
                      ? 'bg-orange-50 dark:bg-orange-500/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div
                    className={cn(
                      'transition-colors',
                      pathname === item.href
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {item.icon}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Floating Bottom Navigation Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200/50 dark:border-slate-700/50 shadow-2xl h-20 rounded-xl px-3">
          <div className="h-full flex items-center justify-between max-w-2xl mx-auto relative">
            {/* Home/Dashboard Button */}
            <Link
              href="/"
              onClick={handleNavigation}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 flex-1',
                isDashboard
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <Home size={24} />
              <span className="text-xs font-medium">Home</span>
            </Link>

            {/* Center floating Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                'absolute left-1/2 transform -translate-x-1/2 -mt-6 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center font-semibold text-white',
                isMenuOpen
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 scale-110'
                  : 'bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:scale-105 active:scale-95'
              )}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* QR Scanner Button */}
            <Link
              href="/scan"
              onClick={handleNavigation}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 flex-1',
                isQRScan
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <ScanLine size={24} />
              <span className="text-xs font-medium">QR Scan</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
