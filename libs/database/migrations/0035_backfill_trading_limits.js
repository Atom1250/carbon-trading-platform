/**
 * Migration 0035: Backfill default trading limits for institutions missing limits rows.
 */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO trading_limits (institution_id, daily_limit_usd, single_trade_min_usd, single_trade_max_usd)
    SELECT
      i.id,
      CASE i.tier
        WHEN 'tier1' THEN 0
        WHEN 'tier2' THEN 250000
        WHEN 'tier3' THEN 1000000
        ELSE 2000000
      END AS daily_limit_usd,
      1 AS single_trade_min_usd,
      CASE i.tier
        WHEN 'tier1' THEN 1000000
        WHEN 'tier2' THEN 250000
        WHEN 'tier3' THEN 500000
        ELSE 1000000
      END AS single_trade_max_usd
    FROM institutions i
    LEFT JOIN trading_limits tl ON tl.institution_id = i.id
    WHERE tl.institution_id IS NULL
  `);
};

exports.down = () => {
  // No-op: backfill data should not be removed.
};
