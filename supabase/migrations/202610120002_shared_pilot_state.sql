-- Shared staging state for the first real multi-device pilot.
-- Keep this project separate from production. App-state access is admin-only in this pilot.
create table if not exists public.app_state (
  id text primary key check (id = 'global'),
  state_json jsonb not null,
  version bigint not null default 1,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;
create policy "admins read app state" on public.app_state for select to authenticated
  using (public.is_admin());
create policy "admins insert app state" on public.app_state for insert to authenticated
  with check (public.is_admin());
create policy "admins update app state" on public.app_state for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- New auth users are always pending sellers. Privileged roles must be assigned by an admin.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, phone, role, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'کاربر جدید'),
    nullif(new.phone,''),
    'seller',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_storewar on auth.users;
create trigger on_auth_user_created_storewar
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Profile owner can read their own approval state; only admins can change role/status.
drop policy if exists "users read own profile or admins read all" on public.profiles;
create policy "users read own profile or admins read all" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
