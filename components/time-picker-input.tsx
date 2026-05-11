'use client';

import * as React from 'react';
import { Check, ChevronDown, Clock3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type TimePickerInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  minTime?: string;
  maxTime?: string;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseTimeValue(value: string) {
  const match = value?.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;

  const hours24 = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours24) || Number.isNaN(minutes)) return null;

  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;

  return {
    hours24,
    hours12,
    minutes: clampNumber(minutes, 0, 59),
    meridiem,
  };
}

function formatTimeValue(hours12: number, minutes: number, meridiem: 'AM' | 'PM') {
  const normalizedHours = clampNumber(hours12, 1, 12);
  const normalizedMinutes = clampNumber(minutes, 0, 59);
  const hour24 = meridiem === 'PM'
    ? normalizedHours === 12
      ? 12
      : normalizedHours + 12
    : normalizedHours === 12
      ? 0
      : normalizedHours;

  return `${String(hour24).padStart(2, '0')}:${String(normalizedMinutes).padStart(2, '0')}`;
}

function formatDisplayTime(value: string) {
  const parsed = parseTimeValue(value);
  if (!parsed) return '';

  return `${String(parsed.hours12).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')} ${parsed.meridiem.toLowerCase()}`;
}

export function TimePickerInput({
  value,
  onChange,
  placeholder = 'Select time',
  className,
  disabled,
  id,
  name,
  minTime,
  maxTime,
}: TimePickerInputProps) {
  const safeValue = value ?? '';
  const parsedValue = React.useMemo(() => parseTimeValue(safeValue), [safeValue]);
  const [open, setOpen] = React.useState(false);
  const [hours, setHours] = React.useState(parsedValue?.hours12 ?? 12);
  const [minutes, setMinutes] = React.useState(parsedValue?.minutes ?? 0);
  const [meridiem, setMeridiem] = React.useState<'AM' | 'PM'>(parsedValue?.meridiem ?? 'AM');

  React.useEffect(() => {
    if (!open) {
      setHours(parsedValue?.hours12 ?? 12);
      setMinutes(parsedValue?.minutes ?? 0);
      setMeridiem(parsedValue?.meridiem ?? 'AM');
    }
  }, [parsedValue, open]);

  const toMinutes = (time?: string | null) => {
    if (!time) return null;
    const parsed = parseTimeValue(time);
    if (!parsed) return null;
    return parsed.hours24 * 60 + parsed.minutes;
  };

  const minMinutes = toMinutes(minTime);
  const maxMinutes = toMinutes(maxTime);

  const isWithinRange = (hours12Value: number, minutesValue: number, meridiemValue: 'AM' | 'PM') => {
    const candidate = formatTimeValue(hours12Value, minutesValue, meridiemValue);
    const candidateMinutes = toMinutes(candidate);
    if (candidateMinutes === null) return false;
    if (minMinutes !== null && candidateMinutes < minMinutes) return false;
    if (maxMinutes !== null && candidateMinutes > maxMinutes) return false;
    return true;
  };

  const hasAnyValidTimeForPeriod = (period: 'AM' | 'PM') => {
    for (let hour = 1; hour <= 12; hour++) {
      for (let minute = 0; minute < 60; minute++) {
        if (isWithinRange(hour, minute, period)) {
          return true;
        }
      }
    }
    return false;
  };

  const getFirstValidTimeForPeriod = (period: 'AM' | 'PM') => {
    for (let hour = 1; hour <= 12; hour++) {
      for (let minute = 0; minute < 60; minute++) {
        if (isWithinRange(hour, minute, period)) {
          return { hour, minute };
        }
      }
    }
    return null;
  };

  const displayValue = formatDisplayTime(safeValue);

  const commitValue = (nextHours = hours, nextMinutes = minutes, nextMeridiem = meridiem) => {
    if (!isWithinRange(nextHours, nextMinutes, nextMeridiem)) return;
    onChange(formatTimeValue(nextHours, nextMinutes, nextMeridiem));
  };

  return (
    <>
      {name ? <input type="hidden" name={name} value={safeValue} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-12 w-full justify-between rounded-[18px] border-orange-200 bg-white px-4 font-mono text-base text-slate-900 shadow-sm hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900',
              'focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20 dark:focus-visible:border-[#ff8a00] dark:focus-visible:ring-[#ff8a00]/20',
              className,
            )}
          >
            <span className={cn('flex items-center gap-2', !displayValue && 'text-slate-400 dark:text-slate-500')}>
              <Clock3 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              {displayValue || placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[20rem] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950" align="start">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pick a time</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose hour, minute, and AM/PM</p>
            </div>
            <Clock3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="grid grid-cols-[1fr_1fr_0.9fr] gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/80">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Hour</p>
              <ScrollArea className="h-56 pr-2">
                <div className="space-y-1">
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => {
                    const selected = hour === hours;
                    const hourDisabled = !isWithinRange(hour, minutes, meridiem);
                    return (
                      <button
                        key={hour}
                        type="button"
                        disabled={hourDisabled}
                        onClick={() => {
                          setHours(hour);
                          commitValue(hour, minutes, meridiem);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                          selected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800',
                          hourDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : '',
                        )}
                      >
                        <span>{String(hour).padStart(2, '0')}</span>
                        {selected ? <Check className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/80">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Minute</p>
              <ScrollArea className="h-56 pr-2">
                <div className="space-y-1">
                  {Array.from({ length: 60 }, (_, index) => index).map((minute) => {
                    const selected = minute === minutes;
                    const minuteDisabled = !isWithinRange(hours, minute, meridiem);
                    return (
                      <button
                        key={minute}
                        type="button"
                        disabled={minuteDisabled}
                        onClick={() => {
                          setMinutes(minute);
                          commitValue(hours, minute, meridiem);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                          selected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800',
                          minuteDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : '',
                        )}
                      >
                        <span>{String(minute).padStart(2, '0')}</span>
                        {selected ? <Check className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/80">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Period</p>
              <div className="space-y-1">
                {(['AM', 'PM'] as const).map((period) => {
                  const selected = period === meridiem;
                  const periodDisabled = !hasAnyValidTimeForPeriod(period);
                  return (
                    <button
                      key={period}
                      type="button"
                      disabled={periodDisabled}
                      onClick={() => {
                        if (periodDisabled) return;
                        if (!isWithinRange(hours, minutes, period)) {
                          const firstValid = getFirstValidTimeForPeriod(period);
                          if (!firstValid) return;
                          setHours(firstValid.hour);
                          setMinutes(firstValid.minute);
                          setMeridiem(period);
                          commitValue(firstValid.hour, firstValid.minute, period);
                          return;
                        }
                        setMeridiem(period);
                        commitValue(hours, minutes, period);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                        selected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800',
                        periodDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : '',
                      )}
                    >
                      <span>{period}</span>
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full px-4"
              onClick={() => {
                setHours(12);
                setMinutes(0);
                setMeridiem('AM');
                onChange('');
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                commitValue();
                setOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}