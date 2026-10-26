-- Farní služby — inicializační skript pro Supabase (PostgreSQL)
-- Spusťte v SQL Editoru (Dashboard → SQL → New query).

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum (
    'hlavni_spravce',
    'spravce_sluzby',
    'spravce_tymu',
    'dobrovolnik'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.assignment_mode as enum ('jednotlivci', 'tymy');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_kind as enum ('standardni', 'mimoradna');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.assignment_status as enum (
    'prirazeno',
    'ceka_na_vymenu',
    'volny_zaskok'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.membership_status as enum ('ceka', 'schvaleno', 'odmitnuto');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_status as enum ('ceka', 'schvaleno', 'odmitnuto', 'zruseno');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.plan_algorithm as enum ('posloupnost', 'ferovy_nahodny');
exception when duplicate_object then null;
end $$;

-- Profily navázané na auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.app_role not null default 'dobrovolnik',
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  assignment_mode public.assignment_mode not null,
  allow_directed_swaps boolean not null default false,
  allow_public_substitutes boolean not null default false,
  substitute_lead_time_hours integer not null default 24
    check (substitute_lead_time_hours >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.service_managers (
  service_id uuid not null references public.services (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (service_id, user_id)
);

create table if not exists public.service_memberships (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.membership_status not null default 'schvaleno',
  created_at timestamptz not null default now(),
  unique (service_id, user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name text not null,
  manager_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (team_id, user_id)
);

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = neděle (JS)
  start_time time not null,
  end_time time not null,
  label text not null
);

-- Preference jen pro služby typu jednotlivci
create table if not exists public.availability_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot_id uuid not null references public.schedule_slots (id) on delete cascade,
  available boolean not null default true,
  primary key (user_id, slot_id)
);

create table if not exists public.plan_periods (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  algorithm public.plan_algorithm not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles (id) on delete set null,
  unique (service_id, starts_on, ends_on)
);

create table if not exists public.plan_assignments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  slot_id uuid references public.schedule_slots (id) on delete set null,
  period_id uuid references public.plan_periods (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.event_kind not null default 'standardni',
  title text not null,
  volunteer_id uuid references public.profiles (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  status public.assignment_status not null default 'prirazeno',
  notes text,
  created_at timestamptz not null default now(),
  check (
    (volunteer_id is not null and team_id is null)
    or (volunteer_id is null and team_id is not null)
    or (volunteer_id is null and team_id is null and status = 'volny_zaskok')
  )
);

create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  from_assignment_id uuid not null references public.plan_assignments (id) on delete cascade,
  to_assignment_id uuid not null references public.plan_assignments (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  status public.request_status not null default 'ceka',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.substitute_listings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.plan_assignments (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  listed_at timestamptz not null default now(),
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz
);

create index if not exists plan_assignments_starts_at_idx
  on public.plan_assignments (starts_at);
create index if not exists plan_assignments_service_idx
  on public.plan_assignments (service_id, starts_at);
create index if not exists swap_requests_status_idx
  on public.swap_requests (status);

-- Výchozí služby
insert into public.services (name, slug, assignment_mode, allow_directed_swaps, allow_public_substitutes, substitute_lead_time_hours)
values
  ('Úklid', 'uklid', 'tymy', true, true, 48),
  ('Kavárna', 'kavarna', 'tymy', true, true, 24),
  ('Kostelník', 'kostelnik', 'jednotlivci', true, true, 12),
  ('Lektor', 'lektor', 'jednotlivci', true, false, 24),
  ('Varhaník', 'varhanik', 'jednotlivci', false, true, 36)
on conflict (slug) do nothing;

-- Rozvrhové sloty
insert into public.schedule_slots (service_id, weekday, start_time, end_time, label)
select s.id, v.weekday, v.start_time::time, v.end_time::time, v.label
from public.services s
join (values
  ('uklid', 6, '08:00', '10:00', 'Sobotní úklid kostela'),
  ('kavarna', 0, '10:00', '12:00', 'Nedělní farní kavárna'),
  ('kostelnik', 0, '08:30', '11:00', 'Nedělní mše — kostelník'),
  ('lektor', 0, '08:45', '10:00', 'Nedělní mše — lektor'),
  ('varhanik', 0, '08:45', '10:30', 'Nedělní mše — varhaník')
) as v(slug, weekday, start_time, end_time, label)
  on v.slug = s.slug
where not exists (
  select 1 from public.schedule_slots x
  where x.service_id = s.id and x.label = v.label
);

-- Profil při registraci
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'dobrovolnik'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_managers enable row level security;
alter table public.service_memberships enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.availability_preferences enable row level security;
alter table public.plan_periods enable row level security;
alter table public.plan_assignments enable row level security;
alter table public.swap_requests enable row level security;
alter table public.substitute_listings enable row level security;

create or replace function public.current_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_main_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_role() = 'hlavni_spravce', false)
$$;

create or replace function public.manages_service(p_service uuid)
returns boolean
language sql
stable
as $$
  select public.is_main_admin()
    or exists (
      select 1 from public.service_managers sm
      where sm.service_id = p_service and sm.user_id = auth.uid()
    )
$$;

-- Čtení: přihlášení uživatelé vidí provozní data farnosti
do $$ begin
  create policy profiles_select on public.profiles for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy profiles_update_self on public.profiles for update to authenticated
    using (id = auth.uid() or public.is_main_admin());
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy profiles_insert_self on public.profiles for insert to authenticated
    with check (id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy services_select on public.services for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy services_write_admin on public.services for all to authenticated
    using (public.is_main_admin()) with check (public.is_main_admin());
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy services_update_manager on public.services for update to authenticated
    using (public.manages_service(id)) with check (public.manages_service(id));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy memberships_select on public.service_memberships for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy memberships_insert_self on public.service_memberships for insert to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy memberships_manage on public.service_memberships for update to authenticated
    using (public.manages_service(service_id));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy assignments_select on public.plan_assignments for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy assignments_manage on public.plan_assignments for all to authenticated
    using (public.manages_service(service_id))
    with check (public.manages_service(service_id));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy swaps_select on public.swap_requests for select to authenticated
    using (requester_id = auth.uid() or target_id = auth.uid() or public.manages_service(service_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy swaps_insert on public.swap_requests for insert to authenticated
    with check (requester_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy listings_select on public.substitute_listings for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy listings_insert on public.substitute_listings for insert to authenticated
    with check (requested_by = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy prefs_self on public.availability_preferences for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy teams_select on public.teams for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy team_members_select on public.team_members for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy slots_select on public.schedule_slots for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy managers_select on public.service_managers for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy periods_select on public.plan_periods for select to authenticated using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy periods_write on public.plan_periods for all to authenticated
    using (public.manages_service(service_id))
    with check (public.manages_service(service_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy slots_write on public.schedule_slots for all to authenticated
    using (public.manages_service(service_id))
    with check (public.manages_service(service_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy teams_write on public.teams for all to authenticated
    using (public.manages_service(service_id) or manager_id = auth.uid())
    with check (public.manages_service(service_id) or manager_id = auth.uid());
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy team_members_write on public.team_members for all to authenticated
    using (
      exists (
        select 1 from public.teams t
        where t.id = team_id
          and (t.manager_id = auth.uid() or public.manages_service(t.service_id))
      )
    )
    with check (
      exists (
        select 1 from public.teams t
        where t.id = team_id
          and (t.manager_id = auth.uid() or public.manages_service(t.service_id))
      )
    );
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy swaps_update on public.swap_requests for update to authenticated
    using (target_id = auth.uid() or requester_id = auth.uid() or public.manages_service(service_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy listings_update on public.substitute_listings for update to authenticated
    using (true);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy managers_write on public.service_managers for all to authenticated
    using (public.is_main_admin()) with check (public.is_main_admin());
exception when duplicate_object then null;
end $$;

-- Atomická výměna (schválení)
create or replace function public.approve_swap(p_swap uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.swap_requests;
  from_row public.plan_assignments;
  to_row public.plan_assignments;
begin
  select * into r from public.swap_requests where id = p_swap and status = 'ceka';
  if not found then
    raise exception 'Žádost o výměnu neexistuje nebo už byla vyřízena.';
  end if;
  if auth.uid() is distinct from r.target_id and not public.manages_service(r.service_id) then
    raise exception 'Tuto výměnu nemůžete schválit.';
  end if;

  select * into from_row from public.plan_assignments where id = r.from_assignment_id;
  select * into to_row from public.plan_assignments where id = r.to_assignment_id;

  update public.plan_assignments
    set volunteer_id = to_row.volunteer_id, team_id = to_row.team_id, status = 'prirazeno'
    where id = from_row.id;
  update public.plan_assignments
    set volunteer_id = from_row.volunteer_id, team_id = from_row.team_id, status = 'prirazeno'
    where id = to_row.id;
  update public.swap_requests
    set status = 'schvaleno', resolved_at = now()
    where id = p_swap;
end;
$$;

-- Uvolnění do burzy se kontrolou lead-time
create or replace function public.list_substitute(p_assignment uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.plan_assignments;
  s public.services;
  listing_id uuid;
begin
  select * into a from public.plan_assignments where id = p_assignment;
  if not found then raise exception 'Termín se nepodařilo najít.'; end if;
  select * into s from public.services where id = a.service_id;
  if not s.allow_public_substitutes then
    raise exception 'Veřejné záskoky u této služby nejsou zapnuté.';
  end if;
  if extract(epoch from (a.starts_at - now())) / 3600 < s.substitute_lead_time_hours then
    raise exception 'Limit pro záskok vypršel.';
  end if;

  update public.plan_assignments
    set status = 'volny_zaskok', volunteer_id = null, team_id = null
    where id = a.id;

  insert into public.substitute_listings (assignment_id, requested_by)
  values (a.id, auth.uid())
  on conflict (assignment_id) do update
    set requested_by = excluded.requested_by, listed_at = now(), claimed_by = null, claimed_at = null
  returning id into listing_id;

  return listing_id;
end;
$$;

-- Okamžité převzetí záskoku
create or replace function public.claim_substitute(p_listing uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.substitute_listings;
  a public.plan_assignments;
  s public.services;
begin
  select * into l from public.substitute_listings where id = p_listing and claimed_by is null;
  if not found then raise exception 'Tento záskok už není volný.'; end if;
  select * into a from public.plan_assignments where id = l.assignment_id;
  select * into s from public.services where id = a.service_id;

  if exists (
    select 1 from public.plan_assignments x
    where x.id <> a.id
      and x.status <> 'volny_zaskok'
      and x.volunteer_id = auth.uid()
      and x.starts_at < a.ends_at
      and a.starts_at < x.ends_at
  ) then
    raise exception 'V tomto čase už máte jinou službu.';
  end if;

  if s.assignment_mode = 'jednotlivci' then
    update public.plan_assignments
      set volunteer_id = auth.uid(), team_id = null, status = 'prirazeno'
      where id = a.id;
  else
    update public.plan_assignments
      set team_id = (
        select t.id from public.teams t
        where t.service_id = s.id
          and (t.manager_id = auth.uid() or exists (
            select 1 from public.team_members tm
            where tm.team_id = t.id and tm.user_id = auth.uid()
          ))
        limit 1
      ),
      volunteer_id = null,
      status = 'prirazeno'
      where id = a.id;
  end if;

  update public.substitute_listings
    set claimed_by = auth.uid(), claimed_at = now()
    where id = p_listing;
end;
$$;
