-- Keep one current-day activity/vitals snapshot per account for device sync.
alter table public.health_readings
  add column if not exists local_date date not null default current_date;

create unique index if not exists health_readings_user_local_date_idx
  on public.health_readings (user_id, local_date);
