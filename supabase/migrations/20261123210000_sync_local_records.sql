-- Preserve Arogyam's existing numeric local IDs while syncing devices.
alter table public.medicines add column if not exists local_id bigint;
alter table public.medicines add column if not exists is_taken boolean not null default false;
alter table public.appointments add column if not exists local_id bigint;

create unique index if not exists medicines_user_local_id_idx
  on public.medicines (user_id, local_id);
create unique index if not exists appointments_user_local_id_idx
  on public.appointments (user_id, local_id);
