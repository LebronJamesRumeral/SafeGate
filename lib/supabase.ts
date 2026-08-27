import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if both URL and key are valid
const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
export const supabase = isValidUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function fetchAllSupabaseRows<T>(query: any, pageSize = 1000): Promise<{ data: T[]; error: any }> {
  const rows: T[] = [];
  let page = 0;

  while (true) {
    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) return { data: rows, error };

    const pageRows = (data || []) as T[];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return { data: rows, error: null };
    page += 1;
  }
}

// Database types
export interface Student {
  id: number;
  lrn: string;
  rfid_uid?: string | null;
  risk_level?: string | null;
  riskLevel?: string | null;
  name: string;
  gender: string;
  birthday: string;
  address: string;
  level: string;
  parent_name: string;
  parent_contact: string;
  parent2_name?: string | null,
  parent2_contact?: string | null,
  parent_email?: string | null,
  parentName: string,
  parentContact: string,
  parent2Name?: string | null,
  parent2Contact?: string | null,
  parentEmail?: string | null;
  status: string;
  substatus?: string | null;
  is_special_case?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceLog {
  id: number;
  student_lrn: string;
  check_in_time: string;
  check_out_time?: string;
  date: string;
  created_at?: string;
}

// HeatmapZone type for Supabase integration
export interface HeatmapZone {
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
