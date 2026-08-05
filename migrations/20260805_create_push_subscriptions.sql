-- Migration: create push_subscriptions table
-- Up: create table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint text PRIMARY KEY,
  keys jsonb,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Optional index on user_id for lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);

-- Down: drop table
-- DROP TABLE IF EXISTS push_subscriptions;
