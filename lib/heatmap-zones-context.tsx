import React, { createContext, useContext, useState, useMemo } from 'react';



export interface HeatZone {

  id: string;

  name: string;

  top: number;

  left: number;

  width: number;

  height: number;

  keywords: string[];

}



interface HeatmapZonesContextValue {

  zones: HeatZone[];

  setZones: React.Dispatch<React.SetStateAction<HeatZone[]>>;

}



const HeatmapZonesContext = createContext<HeatmapZonesContextValue | undefined>(undefined);



export function HeatmapZonesProvider({ children, initialZones }: { children: React.ReactNode; initialZones: HeatZone[] }) {

  const [zones, setZones] = useState<HeatZone[]>(initialZones);

  const value = useMemo(() => ({ zones, setZones }), [zones]);

  return <HeatmapZonesContext.Provider value={value}>{children}</HeatmapZonesContext.Provider>;

}



export function useHeatmapZones() {

  const ctx = useContext(HeatmapZonesContext);

  if (!ctx) throw new Error('useHeatmapZones must be used within a HeatmapZonesProvider');

  return ctx;

}

