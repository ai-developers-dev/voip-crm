-- =====================================================
-- Migration 13: Add full_name Column to voip_users
-- Date: October 24, 2025
-- Purpose: Cache full_name to eliminate repetitive joins
-- =====================================================

-- This migration adds a full_name column to voip_users and backfills it
-- from auth.users metadata. This eliminates the need to join to auth.users
-- or construct first_name + last_name repeatedly in application code.

BEGIN;

-- =====================================================
-- ADD COLUMN
-- =====================================================

ALTER TABLE public.voip_users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

COMMENT ON COLUMN public.voip_users.full_name IS 'Cached full name from auth.users for fast lookups';

-- =====================================================
-- BACKFILL DATA
-- =====================================================

-- Backfill full_name from auth.users metadata
-- This assumes full_name is stored in raw_user_meta_data
UPDATE public.voip_users
SET full_name = (
  SELECT raw_user_meta_data->>'full_name'
  FROM auth.users
  WHERE auth.users.id = voip_users.id
)
WHERE full_name IS NULL;

-- If full_name was not in metadata, try constructing from first_name + last_name
-- (if those fields exist in your auth.users metadata)
UPDATE public.voip_users
SET full_name = COALESCE(
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE auth.users.id = voip_users.id),
  (SELECT
    TRIM(COALESCE(raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(raw_user_meta_data->>'last_name', ''))
    FROM auth.users
    WHERE auth.users.id = voip_users.id
  ),
  (SELECT email FROM auth.users WHERE auth.users.id = voip_users.id)
)
WHERE full_name IS NULL OR full_name = '';

-- =====================================================
-- ADD INDEX
-- =====================================================

CREATE INDEX IF NOT EXISTS voip_users_full_name_idx
  ON public.voip_users(full_name);

COMMENT ON INDEX voip_users_full_name_idx IS 'Index for fast full_name lookups';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  total_users INTEGER;
  users_with_names INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.voip_users;
  SELECT COUNT(*) INTO users_with_names FROM public.voip_users WHERE full_name IS NOT NULL AND full_name != '';

  RAISE NOTICE '✅ Migration 13 complete';
  RAISE NOTICE '📊 Total users: %', total_users;
  RAISE NOTICE '📊 Users with full_name: %', users_with_names;

  IF users_with_names < total_users THEN
    RAISE WARNING '⚠️ Some users do not have full_name populated. Check auth.users metadata.';
  END IF;
END $$;

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
-- To rollback this migration, run:
-- DROP INDEX IF EXISTS public.voip_users_full_name_idx;
-- ALTER TABLE public.voip_users DROP COLUMN IF EXISTS full_name;
