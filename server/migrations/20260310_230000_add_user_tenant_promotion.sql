BEGIN;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS tenant varchar(64),
  ADD COLUMN IF NOT EXISTS promotion varchar(128);

COMMIT;
