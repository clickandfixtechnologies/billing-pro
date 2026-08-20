-- Customer verification evidence is server-originated, never trusted from the browser.
alter table public.acknowledgements
  add column if not exists verification_method text,
  add column if not exists verified_ip inet;
