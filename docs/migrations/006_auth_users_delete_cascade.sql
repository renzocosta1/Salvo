-- =============================================================================
-- Migration 006: Allow deleting auth users (fix "Database error deleting user")
-- =============================================================================
-- Several tables reference auth.users(id) without ON DELETE, so deleting a user
-- in Supabase Dashboard > Authentication fails. This migration adds ON DELETE
-- SET NULL (or makes author_id nullable + SET NULL) so user deletion succeeds.
-- Run in Supabase SQL Editor.
-- =============================================================================

-- parties.general_user_id: allow null when user is deleted
ALTER TABLE parties
  DROP CONSTRAINT IF EXISTS parties_general_user_id_fkey,
  ADD CONSTRAINT parties_general_user_id_fkey
    FOREIGN KEY (general_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- warrior_bands.captain_id: allow null when user is deleted
ALTER TABLE warrior_bands
  DROP CONSTRAINT IF EXISTS warrior_bands_captain_id_fkey,
  ADD CONSTRAINT warrior_bands_captain_id_fkey
    FOREIGN KEY (captain_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- directives.author_id: make nullable and SET NULL when author is deleted (keep directive, author unknown)
ALTER TABLE directives
  ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE directives
  DROP CONSTRAINT IF EXISTS directives_author_id_fkey,
  ADD CONSTRAINT directives_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- h3_tiles.revealed_by_user_id: allow null when user is deleted
ALTER TABLE h3_tiles
  DROP CONSTRAINT IF EXISTS h3_tiles_revealed_by_user_id_fkey,
  ADD CONSTRAINT h3_tiles_revealed_by_user_id_fkey
    FOREIGN KEY (revealed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
