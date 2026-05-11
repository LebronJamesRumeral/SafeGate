'use client';

import * as React from 'react';
import { ChevronDown, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerInputProps = {
  value?: string | null; // expected ISO YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  minDate?: string;
  maxDate?: string;
};

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  const dt = new Date(y, m, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function formatDisplayDate(value?: string | null) {
  const dt = parseIsoDate(value);
  if (!dt) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function DatePickerInput({ value, onChange, placeholder = 'dd/mm/yyyy', className, disabled, id, name, minDate, maxDate }: DatePickerInputProps) {
  const safeValue = value ?? '';
  const parsed = React.useMemo(() => parseIsoDate(safeValue), [safeValue]);
  const parsedMinDate = React.useMemo(() => parseIsoDate(minDate), [minDate]);
  const parsedMaxDate = React.useMemo(() => parseIsoDate(maxDate), [maxDate]);
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState<Date>(() => parsed ?? new Date());
  const [showYearPicker, setShowYearPicker] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setViewDate(parsed ?? new Date());
      setShowYearPicker(false);
    }
  }, [parsed, open]);

  const display = formatDisplayDate(safeValue);

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const days = React.useMemo(() => {
    const first = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const leading = first.getDay(); // 0 Sunday..
    const total = end.getDate();
    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < leading; i++) cells.push({ date: null });
    for (let d = 1; d <= total; d++) cells.push({ date: new Date(viewDate.getFullYear(), viewDate.getMonth(), d) });
    return cells;
  }, [viewDate]);

  const isOutOfRange = (dt: Date) => {
    if (parsedMinDate && dt < parsedMinDate) return true;
    if (parsedMaxDate && dt > parsedMaxDate) return true;
    return false;
  };

  const handleSelect = (dt: Date) => {
    if (isOutOfRange(dt)) return;
    onChange(toIsoDate(dt));
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const handleToday = () => {
    const t = new Date();
    if (isOutOfRange(new Date(t.getFullYear(), t.getMonth(), t.getDate()))) return;
    onChange(toIsoDate(t));
    setViewDate(t);
    setOpen(false);
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
              'h-12 w-full justify-between rounded-[18px] border-orange-200 bg-white px-4 text-sm text-slate-900 shadow-sm hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900',
              'focus-visible:border-[#2563eb] focus-visible:ring-[#2563eb]/20 dark:focus-visible:border-[#ff8a00] dark:focus-visible:ring-[#ff8a00]/20',
              className,
            )}
          >
            <span className={cn('flex items-center gap-2', !display && 'text-slate-400 dark:text-slate-500')}>
              <Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              {display || placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-88 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950" align="start">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pick a date</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click a day to select</p>
            </div>
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          {!showYearPicker ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
                    ◀
                  </button>
                  <button type="button" className="rounded-full px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => setShowYearPicker(true)}>
                    {viewDate.toLocaleString(undefined, { month: 'short' })} {viewDate.getFullYear()}
                  </button>
                  <button type="button" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
                    ▶
                  </button>
                </div>
                <div className="text-xs text-slate-500">Su Mo Tu We Th Fr Sa</div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((cell, idx) => {
                  if (!cell.date) return <div key={idx} className="h-9" />;
                  const isSelected = safeValue && toIsoDate(cell.date) === safeValue;
                  const isToday = toIsoDate(cell.date) === toIsoDate(new Date());
                  const isDisabled = isOutOfRange(cell.date);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelect(cell.date as Date)}
                      className={cn(
                        'h-9 w-9 rounded-md text-sm',
                        isSelected ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800',
                        isDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : '',
                        isToday && !isSelected ? 'ring-1 ring-slate-200' : '',
                      )}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" className="rounded-full px-4" onClick={handleClear}>Clear</Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full px-4"
                    onClick={handleToday}
                    disabled={isOutOfRange(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))}
                  >
                    Today
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear() - 10, viewDate.getMonth(), 1))}>
                    ◀◀
                  </button>
                  <div className="text-sm font-medium min-w-20 text-center">{viewDate.getFullYear()}-{viewDate.getFullYear() + 9}</div>
                  <button type="button" className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear() + 10, viewDate.getMonth(), 1))}>
                    ▶▶
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 10 }, (_, i) => viewDate.getFullYear() - 5 + i).map((year) => {
                  const isSelected = year === viewDate.getFullYear();
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setViewDate(new Date(year, viewDate.getMonth(), 1));
                        setShowYearPicker(false);
                      }}
                      className={cn(
                        'h-10 rounded-md text-sm font-medium transition-colors',
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800',
                      )}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" className="rounded-full px-4" onClick={() => setShowYearPicker(false)}>Back</Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}

export default DatePickerInput;
