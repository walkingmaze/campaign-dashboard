-- Meta-Plant database schema (Supabase / Postgres)
-- Run this once in the Supabase SQL Editor of a new project.
-- The app only talks to Supabase from the server with the secret key,
-- so only the service_role gets access. Row Level Security stays on.

grant usage on schema public to service_role;

-- A Meta campaign and its KPI target
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  meta_campaign_id text unique not null,
  name text not null,
  kpi_metric text not null default 'cpm',
  kpi_target numeric not null default 1,
  kpi_alert_sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per campaign and day (filled by sync-campaigns.js)
create table if not exists insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  snapshot_date date not null,
  spend numeric,
  cpm numeric,
  clicks integer,
  impressions integer,
  created_at timestamptz not null default now(),
  unique (campaign_id, snapshot_date)
);

-- Logged optimizations (filled by the form on /changes)
create table if not exists changes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  change_date date not null,
  change_type text not null,
  comment text,
  metric_before numeric,
  metric_after numeric,
  created_at timestamptz not null default now()
);

alter table campaigns enable row level security;
alter table insight_snapshots enable row level security;
alter table changes enable row level security;

grant select, insert, update, delete on campaigns to service_role;
grant select, insert, update, delete on insight_snapshots to service_role;
grant select, insert, update, delete on changes to service_role;
