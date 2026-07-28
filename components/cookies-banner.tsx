'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cookie, Calendar, Info } from 'lucide-react';
import Cookies from 'js-cookie';

interface CookiesBannerProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentChange: (consent: 'accepted' | 'essential' | 'declined') => void;
}

export function CookiesBanner({
  isOpen,
  onClose,
  onConsentChange,
}: CookiesBannerProps) {
  const [userDate, setUserDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('safegate_cookies_user_date');

      if (savedDate) {
        setUserDate(savedDate);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (
    consent: 'accepted' | 'essential' | 'declined'
  ) => {
    if (!userDate) {
      setError('Please select your date of birth.');
      return;
    }

    // Validate 18+ age
    const birthDate = new Date(userDate);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      setError(
        'You must be at least 18 years old to use SafeGate.'
      );
      return;
    }

    setError('');

    if (typeof window !== 'undefined') {
      localStorage.setItem('safegate_cookies_answered', 'true');
      localStorage.setItem(
        'safegate_cookies_consent',
        consent
      );
      localStorage.setItem(
        'safegate_cookies_user_date',
        userDate
      );

      Cookies.set(
        'safegate_cookies_consent',
        consent,
        {
          expires: 365,
          sameSite: 'lax',
        }
      );

      Cookies.set(
        'safegate_cookies_user_date',
        userDate,
        {
          expires: 365,
          sameSite: 'lax',
        }
      );

      if (
        consent === 'essential' ||
        consent === 'declined'
      ) {
        Cookies.remove('sidebar_state');
        document.cookie =
          'sidebar_state=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      }

      if (consent === 'declined') {
        Cookies.remove('safegate_user');
      }
    }

    onConsentChange(consent);
    onClose();
  };

  const animation = `
    @keyframes cookieSlideUp {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .cookie-modal {
      animation: cookieSlideUp .35s cubic-bezier(.16,1,.3,1);
    }
  `;

  return (
    <>
      <style>{animation}</style>

      {/*
        Mobile: full-width bar pinned to the bottom, small side margins.
        Desktop (sm+): reverts to a floating card anchored bottom-right.
      */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 pointer-events-none sm:inset-x-auto sm:right-36 sm:bottom-6 sm:justify-end sm:px-0 sm:pb-0">
        <div
          className="cookie-modal pointer-events-auto w-full max-w-md rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 max-h-[85vh] overflow-y-auto"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >

          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center shrink-0">
              <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                Cookie Consent & Personalization
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                We use cookies to secure your session and remember your
                preferences. Please provide your date of birth and
                cookie choice.
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-3">
            <Label
              htmlFor="cookie-user-date"
              className="flex items-center gap-2 text-xs font-semibold"
            >
              <Calendar className="h-4 w-4 text-blue-500" />
              Date of Birth
            </Label>

            <Input
              id="cookie-user-date"
              type="date"
              value={userDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setUserDate(e.target.value);
                setError('');
              }}
              className="h-10 text-sm"
            />

            {error && (
              <p className="text-xs text-red-500 font-semibold">
                {error}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="flex gap-2 rounded-xl border border-blue-100 dark:border-slate-800 bg-blue-50/70 dark:bg-slate-800/40 p-3 text-[11px] text-slate-600 dark:text-slate-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />

            <span>
              <strong>Note:</strong> Essential cookies are required to
              authenticate and keep you logged in. You must also be
              <strong> 18 years old or older</strong> to use this
              system. Selecting <strong>Decline All</strong> will
              prevent sign in.
            </span>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => handleSave('declined')}
              className="border-red-200 text-red-600 hover:bg-red-50 w-full"
            >
              Decline All
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSave('essential')}
              className="w-full"
            >
              Essential Only
            </Button>

            <Button
              onClick={() => handleSave('accepted')}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full"
            >
              Accept All
            </Button>
          </div>

        </div>
      </div>
    </>
  );
}