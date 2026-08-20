-- Phase 1: secure acknowledgement backend. Apply with `supabase db push` only
-- after reviewing this migration in the target Supabase project.
create table if not exists public.acknowledgements (
  id uuid primary key default gen_random_uuid(),
  acknowledgement_no text not null unique,
  invoice_id text not null,
  invoice_no text not null,
  customer_id text not null,
  customer_name text not null,
  customer_email text not null,
  customer_mobile text not null,
  customer_address text,
  customer_gstin text,
  invoice_date date not null,
  delivery_date date not null,
  invoice_total numeric(14,2) not null check (invoice_total >= 0),
  status text not null default 'DRAFT' check (status in ('DRAFT','SENT','PENDING_VERIFICATION','VERIFIED','SIGNED','VOID')),
  access_token_hash text not null unique,
  token_expires_at timestamptz not null,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_requested_at timestamptz,
  otp_attempts integer not null default 0 check (otp_attempts >= 0),
  otp_verified_at timestamptz,
  verified_email text,
  verification_token_hash text,
  verification_expires_at timestamptz,
  delivery_location text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_address text,
  receiver_name text,
  condition_confirmed boolean not null default false,
  issue_remark text,
  signature_data text,
  signed_at timestamptz,
  signed_ip inet,
  physical_document_url text,
  created_by_firebase_uid text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text
);

create index if not exists acknowledgements_invoice_id_idx on public.acknowledgements(invoice_id);
create index if not exists acknowledgements_customer_id_idx on public.acknowledgements(customer_id);
create index if not exists acknowledgements_status_idx on public.acknowledgements(status);

create table if not exists public.ack_events (
  id bigint generated always as identity primary key,
  acknowledgement_id uuid not null references public.acknowledgements(id) on delete restrict,
  event_type text not null check (event_type in ('CREATED','SENT','RESENT','PAGE_OPENED','OTP_REQUESTED','OTP_VERIFIED','LOCATION_CAPTURED','SIGNATURE_STARTED','SIGNED','PDF_DOWNLOADED','VOIDED','PHYSICAL_DOCUMENT_ADDED','ADMIN_VIEWED')),
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ack_events_acknowledgement_id_idx on public.ack_events(acknowledgement_id, created_at desc);

alter table public.acknowledgements enable row level security;
alter table public.ack_events enable row level security;

-- No anon/authenticated policies are intentionally created. All access goes
-- through the Edge Function using service-role credentials after token/session checks.

create or replace function public.touch_acknowledgement_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists acknowledgements_updated_at on public.acknowledgements;
create trigger acknowledgements_updated_at before update on public.acknowledgements
for each row execute function public.touch_acknowledgement_updated_at();
