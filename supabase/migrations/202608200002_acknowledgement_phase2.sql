-- Phase 2 metadata. Safe to apply after the Phase 1 migration.
alter table public.acknowledgements
  add column if not exists signature_method text check (signature_method in ('physical','digital')),
  add column if not exists physical_document_name text,
  add column if not exists physical_document_uploaded_at timestamptz,
  add column if not exists physical_document_notes text;
