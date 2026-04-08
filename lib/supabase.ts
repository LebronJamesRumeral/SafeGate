import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if both URL and key are valid
const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');
export const supabase = isValidUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
  parent_email?: string | null;
  parentName: string;
  parentContact: string;
  parentEmail?: string | null;
  status: string;
  substatus?: string | null;
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
