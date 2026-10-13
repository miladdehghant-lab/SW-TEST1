# STORE WAR pilot — first online setup

This branch is an isolated staging candidate. It is not the production release.

## 1. Create a dedicated Supabase staging project
Do not use a production database for the first tests. In Supabase, open SQL Editor and run both migrations in order:
- `supabase/migrations/202610120001_storewar_core.sql`
- `supabase/migrations/202610120002_shared_pilot_state.sql`

In Authentication settings, enable Phone provider with password sign-in if offered by the project configuration. Disable public self-registration for the first admin-only test.

## 2. Create the first administrator
Create a user in Supabase Authentication using the admin's Iranian phone in E.164 form (for example, +98912xxxxxxx) and a strong unique password. The auth trigger creates a pending seller profile. Then run this SQL, replacing the UUID with the new Auth user's UUID:

```sql
update public.profiles
set role = 'admin', status = 'approved', display_name = 'STORE WAR Admin'
where id = 'REPLACE-WITH-AUTH-USER-UUID';
```

Confirm exactly one row was updated. Do not share the password or service-role key.

## 3. Configure deployment secrets
In GitHub repository Settings → Secrets and variables → Actions, add:
- `VITE_SUPABASE_URL`: Project URL from Supabase API settings
- `VITE_SUPABASE_ANON_KEY`: publishable/anon key from Supabase API settings

Never use the Supabase service-role key in a browser build.

In GitHub repository Settings → Pages, set the build/deployment source to **GitHub Actions**. The workflow in this branch builds and deploys the pilot branch.

## 4. Test on devices
After the workflow succeeds, open the GitHub Pages URL shown in Actions → STORE WAR pilot build and deploy → deploy job. Log in on each device with the same admin account. Data is stored in the shared Supabase `app_state` row, not only in local browser storage. Reload another device to fetch the latest state.

## 5. Current pilot limits — read before entering data
- This initial online pilot intentionally permits only an approved admin account to access the shared application state.
- Existing operational user records created inside the UI are test records; they do not yet create separate Supabase Auth identities. Do not use this branch for a real multi-role workforce pilot yet.
- Shared state is stored as one JSON document. It is suitable for a controlled admin-only evaluation, not concurrent multi-user production operation.
- Do not upload unmasked customer/consumer data, sensitive employee data, or real sales files unless authorized and cleared for use.
- Photo evidence currently follows the existing UI's storage behavior; test with small synthetic images only.
- Before opening access to salespeople, representatives, or support staff, replace the single-document persistence with normalized repositories and enforce role/territory scope on every API/database operation.

## Acceptance checks
- [ ] Supabase migrations applied successfully
- [ ] Auth admin exists and matching profile is approved/admin
- [ ] GitHub Actions secrets added
- [ ] Pages source set to GitHub Actions
- [ ] Type check and build both pass
- [ ] Login works from two different devices
- [ ] Store/activity/test record created on device A is visible after reload on device B
- [ ] Reset data and logout behavior verified
