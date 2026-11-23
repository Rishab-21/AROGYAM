-- Arogyam's private user data. Every row is scoped to the signed-in owner.
-- The app must use Supabase Auth before it can read or write these tables.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  age smallint check (age is null or age between 1 and 120),
  gender text check (gender is null or gender in ('Female', 'Male', 'Other')),
  height_cm numeric(5, 1) check (height_cm is null or height_cm between 30 and 300),
  weight_kg numeric(5, 1) check (weight_kg is null or weight_kg between 1 and 700),
  conditions text[] not null default '{}',
  food_preference text check (food_preference is null or food_preference in ('Vegetarian', 'Non-vegetarian', 'Vegan')),
  daily_step_goal integer not null default 10000 check (daily_step_goal between 0 and 200000),
  daily_water_goal_ml integer not null default 0 check (daily_water_goal_ml between 0 and 20000),
  nominee_name text not null default '',
  nominee_relationship text not null default '',
  nominee_phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id bigint not null,
  name text not null check (length(trim(name)) between 1 and 200),
  dosage text not null default '',
  reminder_time time not null,
  food_instruction text not null default '',
  is_paused boolean not null default false,
  is_taken boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id bigint not null,
  title text not null check (length(trim(title)) between 1 and 200),
  doctor text not null default '',
  location text not null default '',
  appointment_date date not null,
  appointment_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_date date not null default current_date,
  recorded_at timestamptz not null default now(),
  heart_rate_bpm smallint check (heart_rate_bpm is null or heart_rate_bpm between 20 and 250),
  systolic_mmhg smallint check (systolic_mmhg is null or systolic_mmhg between 40 and 300),
  diastolic_mmhg smallint check (diastolic_mmhg is null or diastolic_mmhg between 20 and 200),
  temperature_c numeric(4, 1) check (temperature_c is null or temperature_c between 25 and 50),
  steps integer check (steps is null or steps between 0 and 200000),
  water_ml integer check (water_ml is null or water_ml between 0 and 20000),
  sleep_hours numeric(4, 2) check (sleep_hours is null or sleep_hours between 0 and 24),
  distance_km numeric(7, 2) check (distance_km is null or distance_km between 0 and 1000),
  source text not null default 'band' check (source in ('band', 'phone', 'manual'))
);

create index if not exists medicines_user_id_idx on public.medicines (user_id);
create index if not exists appointments_user_date_idx on public.appointments (user_id, appointment_date, appointment_time);
create index if not exists health_readings_user_recorded_idx on public.health_readings (user_id, recorded_at desc);
create unique index if not exists medicines_user_local_id_idx on public.medicines (user_id, local_id);
create unique index if not exists appointments_user_local_id_idx on public.appointments (user_id, local_id);
create unique index if not exists health_readings_user_local_date_idx on public.health_readings (user_id, local_date);

alter table public.profiles enable row level security;
alter table public.medicines enable row level security;
alter table public.appointments enable row level security;
alter table public.health_readings enable row level security;

create policy "Users can access their own profile" on public.profiles
for all to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can access their own medicines" on public.medicines
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can access their own appointments" on public.appointments
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can access their own health readings" on public.health_readings
for all to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.medicines, public.appointments, public.health_readings from anon;
grant select, insert, update, delete on public.profiles, public.medicines, public.appointments, public.health_readings to authenticated;
