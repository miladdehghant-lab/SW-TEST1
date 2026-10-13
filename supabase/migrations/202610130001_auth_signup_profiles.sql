-- Create a pending STORE WAR profile whenever a user signs up through Supabase Auth.
-- Requested role is allow-listed; clients can never self-register as admin.
create or replace function public.handle_new_storewar_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  safe_role text;
  user_phone text;
  user_name text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'requested_role', 'seller');
  safe_role := case
    when requested_role in ('seller', 'supervisor', 'support', 'rep') then requested_role
    else 'seller'
  end;
  user_phone := coalesce(new.phone, new.raw_user_meta_data ->> 'phone');
  user_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, display_name, phone, role, status)
  values (
    new.id,
    coalesce(user_name, user_phone, 'کاربر جدید'),
    user_phone,
    safe_role,
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_storewar on auth.users;
create trigger on_auth_user_created_storewar
  after insert on auth.users
  for each row execute procedure public.handle_new_storewar_user();
