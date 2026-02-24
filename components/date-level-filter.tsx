'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type DateMode = 'all' | 'single' | 'range';

interface DateLevelFilterProps {
  dateMode: DateMode;
  setDateMode: (mode: DateMode) => void;
  singleDate: string;
  setSingleDate: (date: string) => void;
  rangeStart: string;
  setRangeStart: (date: string) => void;
  rangeEnd: string;
  setRangeEnd: (date: string) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
}

export function DateLevelFilter({
  dateMode,
  setDateMode,
  singleDate,
  setSingleDate,
  rangeStart,
  setRangeStart,
  rangeEnd,
  setRangeEnd,
  selectedLevel,
  setSelectedLevel,
}: DateLevelFilterProps) {
  const [levels, setLevels] = useState<string[]>([]);

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('level')
        .order('level');

      if (error) throw error;

      const uniqueLevels = Array.from(new Set(data?.map(s => s.level) || [])).sort();
      setLevels(uniqueLevels);
    } catch (error) {
      console.error('Error fetching levels:', error);
    }
  };

  return (
    <div className="w-full bg-card/50 dark:bg-slate-950/60 rounded-xl border border-border/40 dark:border-slate-800/60 p-6 shadow-lg backdrop-blur-sm">
      {/* Date Mode Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setDateMode('all')}
          className={`px-5 py-2 text-sm font-semibold rounded-full transition whitespace-nowrap ${
            dateMode === 'all'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground border border-border/40 hover:border-border/60'
          }`}
        >
          ALL dates
        </button>
        <button
          type="button"
          onClick={() => setDateMode('single')}
          className={`px-5 py-2 text-sm font-semibold rounded-full transition whitespace-nowrap ${
            dateMode === 'single'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground border border-border/40 hover:border-border/60'
          }`}
        >
          Single date
        </button>
        <button
          type="button"
          onClick={() => setDateMode('range')}
          className={`px-5 py-2 text-sm font-semibold rounded-full transition whitespace-nowrap ${
            dateMode === 'range'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground border border-border/40 hover:border-border/60'
          }`}
        >
          Date range
        </button>
      </div>

      {/* Input Fields Grid - Always show all 3 */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {/* Range Start - Always visible */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Range Start
          </label>
          <Input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            disabled={dateMode === 'single' || dateMode === 'all'}
            className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed font-mono text-lg"
          />
        </div>

        {/* Range End - Always visible */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Range End
          </label>
          <Input
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            disabled={dateMode === 'single' || dateMode === 'all'}
            className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed font-mono text-lg"
          />
        </div>

        {/* Single Date - Always visible */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Single Date
          </label>
          <Input
            type="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            disabled={dateMode === 'range' || dateMode === 'all'}
            className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed font-mono text-lg"
          />
        </div>

        {/* Student Level */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Student Level
          </label>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 font-mono text-lg">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="bg-background dark:bg-slate-900 border-border/40 dark:border-slate-800/60">
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
