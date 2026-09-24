import { supabase } from '@/lib/supabase';

let refreshPromise: Promise<number | null> | null = null;

export function recalculateAllRiskScores() {
  if (!supabase) return Promise.resolve(null);
  if (refreshPromise) return refreshPromise;

  refreshPromise = supabase
    .rpc('recalculate_all_risk_scores')
    .then(({ data, error }) => {
      if (error) throw error;
      return typeof data === 'number' ? data : null;
    })
    .catch((error) => {
      console.error('Failed to recalculate risk scores:', error);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}