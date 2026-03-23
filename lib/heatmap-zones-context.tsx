import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { supabase, HeatmapZone } from './supabase';

export interface HeatZone {
  id: number;
  name: string;
  top: number;
  left: number;
  width: number;
  height: number;
  keywords: string[];
  created_at?: string;
  updated_at?: string;
}

interface HeatmapZonesContextValue {
  zones: HeatZone[];
  loading: boolean;
  loadZones: () => Promise<void>;
  addZone: (zone: Omit<HeatZone, 'id' | 'created_at' | 'updated_at'>) => Promise<HeatZone | null>;
  updateZone: (id: number, updates: Partial<Omit<HeatZone, 'id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
  deleteZone: (id: number) => Promise<boolean>;
}

const HeatmapZonesContext = createContext<HeatmapZonesContextValue | undefined>(undefined);

export function HeatmapZonesProvider({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<HeatZone[]>([]);
  const [loading, setLoading] = useState(false);

  const loadZones = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('heatmap_zones').select('*').order('id', { ascending: true });
    if (!error && Array.isArray(data)) {
      const sorted = [...(data as HeatZone[])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
      setZones(sorted);
    }
    setLoading(false);
  }, []);

  const addZone = useCallback(async (zone: Omit<HeatZone, 'id' | 'created_at' | 'updated_at'>) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('heatmap_zones').insert([zone]).select('*').single();
    if (!error && data) {
      setZones((prev) => {
        const next = [...prev, data as HeatZone];
        next.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
        return next;
      });
      return data as HeatZone;
    }
    return null;
  }, []);

  const updateZone = useCallback(async (id: number, updates: Partial<Omit<HeatZone, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!supabase) return false;
    const { error } = await supabase.from('heatmap_zones').update(updates).eq('id', id);
    if (!error) {
      setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
      return true;
    }
    return false;
  }, []);

  const deleteZone = useCallback(async (id: number) => {
    if (!supabase) return false;
    const { error } = await supabase.from('heatmap_zones').delete().eq('id', id);
    if (!error) {
      setZones((prev) => prev.filter((z) => z.id !== id));
      return true;
    }
    return false;
  }, []);

  const value = useMemo(
    () => ({ zones, loading, loadZones, addZone, updateZone, deleteZone }),
    [zones, loading, loadZones, addZone, updateZone, deleteZone]
  );

  return <HeatmapZonesContext.Provider value={value}>{children}</HeatmapZonesContext.Provider>;
}

export function useHeatmapZones() {
  const ctx = useContext(HeatmapZonesContext);
  if (!ctx) throw new Error('useHeatmapZones must be used within a HeatmapZonesProvider');
  return ctx;
}

