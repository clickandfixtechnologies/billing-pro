# Acknowledgement Phase 1 deployment

This folder is intentionally not deployed by this change.

1. Link the CLI to Supabase project `efmducfzefuoisjkuerv`.
2. Review and apply `migrations/202608200001_acknowledgements.sql` with `supabase db push`.
3. Set Edge Function secrets. Never place any of these in browser JavaScript:

   - `SUPABASE_URL=https://efmducfzefuoisjkuerv.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<Supabase service-role secret>`
   - `BREVO_API_KEY=<Brevo secret>`
   - `BREVO_SENDER_EMAIL=clicknfixtechnologies@gmail.com`
   - `BREVO_SENDER_NAME=Click & Fix Technologies`
   - `FIREBASE_PROJECT_ID=click-n-fix-crm`
   - `FIREBASE_ADMIN_EMAILS=<comma-separated existing Firebase admin email addresses>`

4. Deploy only after a non-production test: `supabase functions deploy acknowledgement --no-verify-jwt`.

The public browser client uses the supplied publishable key and calls the Edge Function URL (`/functions/v1/acknowledgement`), not the REST URL (`/rest/v1/`). `verify_jwt=false` is safe here only because the function independently verifies Firebase tokens for every admin action; all customer actions are scoped by a random hashed acknowledgement token and a short-lived verified session.
