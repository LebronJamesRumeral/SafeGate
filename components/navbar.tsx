'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Moon, Sun, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    setIsDark(!isDark);
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  };

  // All menu items
  const allNavItems = [
    { href: '/', label: 'Dashboard', roles: ['admin', 'guidance'] },
    { href: '/behavioral-events', label: 'Behavioral Events', roles: ['teacher', 'admin', 'guidance'] },
    { href: '/scan', label: 'Attendance / QR Scan', roles: ['teacher', 'admin'] },
    { href: '/attendance', label: 'Attendance Logs', roles: ['teacher', 'admin'] },
    { href: '/students', label: 'Current Students', roles: ['teacher', 'admin'] },
    { href: '/masterlist', label: 'Masterlist', roles: ['admin'] },
    { href: '/analytics', label: 'Analytics', roles: ['admin'] },
  ];

  // Filter nav items based on user role
  const navItems = user ? allNavItems.filter(item => item.roles.includes(user.role)) : [];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-orange-200/50 dark:border-slate-700/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 p-1">
              <Image 
                src="/SGCDC.png" 
                alt="SGCDC Logo" 
                width={48} 
                height={48} 
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">SGCDC</span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-none">SafeGate Behavior and Intervention System</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-[#2563eb]/10 dark:hover:bg-[#2563eb]/20 hover:text-[#1e3a8a] dark:hover:text-[#fcd34d] transition-all duration-300 relative group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#1e3a8a] to-[#ff8a00] dark:from-[#fbbf24] dark:to-[#ff8a00] group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[#fbbf24]/20 dark:hover:bg-[#fbbf24]/10 transition-all duration-300 group"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun size={20} className="text-[#fbbf24] group-hover:scale-110 transition-transform" />
              ) : (
                <Moon size={20} className="text-[#1e3a8a] group-hover:scale-110 transition-transform" />
              )}
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all duration-300 group"
              aria-label="Logout"
            >
              <LogOut size={20} className="text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={20} className="text-slate-700 dark:text-slate-300" /> : <Menu size={20} className="text-slate-700 dark:text-slate-300" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
