'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchLevels();
  }, []);

  useEffect(() => {
    setExpanded(!isMobile);
  }, [isMobile]);

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

  const getDateSummary = () => {
    if (dateMode === 'all') return 'All dates';
    if (dateMode === 'single') return `Single: ${singleDate}`;
    return `${rangeStart} - ${rangeEnd}`;
  };

  return (
    <div className="w-full bg-card/50 dark:bg-slate-950/60 rounded-xl border border-border/40 dark:border-slate-800/60 p-4 sm:p-6 shadow-lg backdrop-blur-sm">
      {isMobile && (
        <div className="mb-4 rounded-lg border border-border/40 bg-slate-50/60 p-3 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</p>
              <p className="truncate text-sm font-medium text-foreground">{getDateSummary()} • {selectedLevel === 'all' ? 'All Levels' : selectedLevel}</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded-md border border-border/50 px-3 py-1.5 text-xs font-semibold text-foreground"
            >
              {expanded ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      )}

      {(!isMobile || expanded) && (
        <>
      {/* Date Mode Tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setDateMode('all')}
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition whitespace-nowrap ${
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
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition whitespace-nowrap ${
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
          className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition whitespace-nowrap ${
            dateMode === 'range'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground border border-border/40 hover:border-border/60'
          }`}
        >
          Date range
        </button>
      </div>

      {/* Input Fields Grid - Always show all 3 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
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
            className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed font-mono text-base sm:text-lg"
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
            className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed font-mono text-base sm:text-lg"
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
            className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed font-mono text-base sm:text-lg"
          />
        </div>

        {/* Student Level */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Student Level
          </label>
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="h-11 bg-muted/30 dark:bg-slate-800/40 border-border/40 dark:border-slate-700/60 text-foreground dark:text-slate-200 font-mono text-base sm:text-lg">
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
        </>
      )}
    </div>
  );
}
