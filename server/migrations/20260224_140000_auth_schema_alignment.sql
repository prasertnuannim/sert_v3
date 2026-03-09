-- Align auth schema for NextAuth-style tables + custom refresh token table
-- PostgreSQL only

BEGIN;

-- 1) refresh_token_models.user_id: integer -> varchar(36)
DO $$
BEGIN
  IF to_regclass('public.refresh_token_models') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'refresh_token_models'
        AND column_name = 'user_id'
        AND data_type <> 'character varying'
    ) THEN
      ALTER TABLE public.refresh_token_models
        ALTER COLUMN user_id TYPE varchar(36)
        USING user_id::text;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_refresh_token_models_user_id
  ON public.refresh_token_models (user_id);

-- 2) accounts: enforce unique(provider, provider_account_id)
DO $$
BEGIN
  IF to_regclass('public.accounts') IS NOT NULL THEN
    DELETE FROM public.accounts a
    USING public.accounts b
    WHERE a.ctid < b.ctid
      AND a.provider = b.provider
      AND a.provider_account_id = b.provider_account_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_provider_provider_account_id
  ON public.accounts (provider, provider_account_id);

-- 3) verification_tokens: enforce unique(identifier, token)
DO $$
BEGIN
  IF to_regclass('public.verification_tokens') IS NOT NULL THEN
    DELETE FROM public.verification_tokens a
    USING public.verification_tokens b
    WHERE a.ctid < b.ctid
      AND a.identifier = b.identifier
      AND a.token = b.token;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_tokens_identifier_token
  ON public.verification_tokens (identifier, token);

-- 4) authenticators: enforce unique(credential_id)
DO $$
BEGIN
  IF to_regclass('public.authenticators') IS NOT NULL THEN
    DELETE FROM public.authenticators a
    USING public.authenticators b
    WHERE a.ctid < b.ctid
      AND a.credential_id = b.credential_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_authenticators_credential_id
  ON public.authenticators (credential_id);

COMMIT;
