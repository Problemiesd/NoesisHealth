create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  daily_protein_target_g numeric(10, 2) not null default 120,
  daily_calorie_target_kcal numeric(10, 2) not null default 2200,
  sleep_target_hours numeric(10, 2) not null default 7.5,
  supplement_schedule jsonb not null default '[]'::jsonb,
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  category text not null,
  raw_text text not null,
  status text not null check (status in ('complete', 'incomplete')),
  clarification_question text,
  based_on jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now()
);

create table if not exists food_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  food_key text not null,
  food_label text not null,
  quantity numeric(10, 2) not null,
  unit text not null,
  kcal numeric(10, 2) not null,
  protein_g numeric(10, 2) not null,
  carbs_g numeric(10, 2),
  fat_g numeric(10, 2),
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now()
);

create table if not exists sleep_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  duration_minutes integer,
  duration_hours numeric(10, 2),
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now()
);

create table if not exists supplement_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  supplement_name text not null,
  amount numeric(10, 2),
  unit text,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now()
);

create table if not exists weight_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  weight_kg numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now()
);

create table if not exists exercise_entries (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references logs(id) on delete cascade,
  exercise_name text,
  minutes integer,
  created_at timestamptz not null default now(),
  logged_at timestamptz not null default now()
);

create table if not exists supplement_stock (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  supplement_name text not null,
  quantity_remaining numeric(10, 2) not null default 0,
  unit text not null default 'count',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_summaries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  summary_date date not null,
  total_kcal numeric(10, 2) not null default 0,
  total_protein_g numeric(10, 2) not null default 0,
  sleep_hours numeric(10, 2) not null default 0,
  supplements_taken jsonb not null default '[]'::jsonb,
  latest_weight_kg numeric(10, 2),
  incomplete_log_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, summary_date)
);

create or replace view daily_summaries_view as
with days as (
  select distinct date(logged_at) as summary_date
  from logs
)
select
  d.summary_date,
  coalesce((
    select sum(fe.kcal)
    from logs l
    join food_entries fe on fe.log_id = l.id
    where date(l.logged_at) = d.summary_date
      and l.status = 'complete'
  ), 0) as total_kcal,
  coalesce((
    select sum(fe.protein_g)
    from logs l
    join food_entries fe on fe.log_id = l.id
    where date(l.logged_at) = d.summary_date
      and l.status = 'complete'
  ), 0) as total_protein_g,
  coalesce((
    select sum(se.duration_hours)
    from logs l
    join sleep_entries se on se.log_id = l.id
    where date(l.logged_at) = d.summary_date
      and l.status = 'complete'
  ), 0) as sleep_hours,
  coalesce((
    select jsonb_agg(supplement_name)
    from logs l
    join supplement_entries se on se.log_id = l.id
    where date(l.logged_at) = d.summary_date
      and l.status = 'complete'
  ), '[]'::jsonb) as supplements_taken,
  (
    select we.weight_kg
    from logs l
    join weight_entries we on we.log_id = l.id
    where date(l.logged_at) = d.summary_date
      and l.status = 'complete'
    order by l.logged_at desc
    limit 1
  ) as latest_weight_kg,
  (
    select count(*)
    from logs l
    where date(l.logged_at) = d.summary_date
      and l.status = 'incomplete'
  ) as incomplete_log_count
from days d;

create table if not exists health_app_states (
  device_id text primary key,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists health_app_states_touch_updated_at on health_app_states;

create trigger health_app_states_touch_updated_at
before update on health_app_states
for each row
execute function touch_updated_at();
