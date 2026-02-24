BEGIN;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS role varchar(32);

UPDATE public.users
SET role = 'user'
WHERE role IS NULL OR role = '';

ALTER TABLE IF EXISTS public.users
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN role SET NOT NULL;

COMMIT;
