-- Migration: Create system_settings table
-- Date: 2026-06-02

CREATE TABLE IF NOT EXISTS public.system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
