-- =====================================================
-- ROLLBACK SCRIPT: Database Optimization v4.0
-- Date: October 24, 2025
-- Purpose: Removes indexes and columns added in v4.0
-- =====================================================
-- WARNING: This removes performance optimizations!
-- Only run if you need to rollback to v3.0 state
-- =====================================================

-- Drop indexes added in migration 12
DROP INDEX IF EXISTS public.calls_assigned_to_idx;
DROP INDEX IF EXISTS public.calls_from_number_org_idx;
DROP INDEX IF EXISTS public.calls_to_number_org_idx;
DROP INDEX IF EXISTS public.calls_direction_created_at_idx;
DROP INDEX IF EXISTS public.calls_answered_at_idx;
DROP INDEX IF EXISTS public.calls_ended_at_idx;
DROP INDEX IF EXISTS public.contacts_phone_idx;
DROP INDEX IF EXISTS public.contacts_org_phone_idx;
DROP INDEX IF EXISTS public.sms_conversations_contact_phone_idx;

-- Drop full_name index and column added in migration 13
DROP INDEX IF EXISTS public.voip_users_full_name_idx;
ALTER TABLE public.voip_users DROP COLUMN IF EXISTS full_name;

-- Verify rollback
DO $$
BEGIN
  RAISE NOTICE '✅ Rollback complete - removed 9 indexes and 1 column';
  RAISE NOTICE '⚠️  Database is now in v3.0 state (slower queries)';
  RAISE NOTICE '📊 To verify: SELECT * FROM pg_indexes WHERE indexname LIKE ''%assigned_to_idx%'';';
END $$;
