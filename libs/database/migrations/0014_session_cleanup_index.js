/**
 * Migration 0014: Session Cleanup Optimization
 * Adds indexes to the sessions table to speed up:
 *   - Expired session cleanup (DELETE WHERE expires_at < NOW())
 *   - Active session lookup by user (SELECT WHERE user_id AND NOT is_revoked)
 *
 * Note: plain (non-partial) indexes are used so they remain valid across
 * all future rows, not just those present at migration time.
 */

exports.up = (pgm) => {
  // Speeds up: DELETE FROM sessions WHERE expires_at < NOW()
  pgm.sql(`
    CREATE INDEX idx_sessions_expires_at_cleanup
      ON sessions(expires_at)
  `);

  // Speeds up: SELECT ... FROM sessions WHERE user_id = $1 AND is_revoked = FALSE
  pgm.sql(`
    CREATE INDEX idx_sessions_user_id_active
      ON sessions(user_id, is_revoked)
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_sessions_expires_at_cleanup');
  pgm.sql('DROP INDEX IF EXISTS idx_sessions_user_id_active');
};
