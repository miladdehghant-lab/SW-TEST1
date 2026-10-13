# STORE WAR — Pilot release checklist

## Current branch
- Branch: `release/real-db-pilot`
- This branch is isolated from `main`; do not merge until the build and acceptance tests pass.

## Database
1. Create a dedicated Supabase project for staging.
2. Apply `supabase/migrations/202610120001_storewar_core.sql` in the SQL editor.
3. Create the initial administrator in Supabase Auth.
4. Insert the matching profile row with role `admin` and status `approved`.
5. Configure the project URL and anon/publishable key as local environment variables and GitHub Actions secrets.
6. Never expose the Supabase service-role key in browser code or a `VITE_*` variable.

## Important status
The migration creates normalized tables and restrictive initial RLS policies. It does **not by itself connect the current React state store to these tables**. The UI integration and a successful build are required before this can be called a multi-device database-backed release. Do not enter production/customer data yet.

## Acceptance before testing across devices
- [ ] Frontend uses Supabase Auth rather than local hardcoded credentials.
- [ ] UI state is loaded from and persisted to the database.
- [ ] User passwords are never stored in application tables.
- [ ] No default admin session, hardcoded password, fake GPS, or seeded personal data remains.
- [ ] Role/data-scope enforcement is server-side and tested.
- [ ] Excel batch approval is atomic and duplicate-safe.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] Database restore and application rollback are tested.

## Staging data
Use synthetic data by default. Use anonymized real data only when use is authorized and re-identification risk has been reviewed.
