import bcrypt from 'bcrypt';
import { createDatabaseClientFromEnv } from '@libs/database';

const ADMIN_INSTITUTION_ID = process.env['ADMIN_INSTITUTION_ID'] ?? '10000000-0000-4000-8000-000000000001';
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@uat.local';
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'AdminPass123!';
const ADMIN_FIRST_NAME = process.env['ADMIN_FIRST_NAME'] ?? 'UAT';
const ADMIN_LAST_NAME = process.env['ADMIN_LAST_NAME'] ?? 'Administrator';
const ADMIN_INSTITUTION_NAME = process.env['ADMIN_INSTITUTION_NAME'] ?? 'UAT Test Institution';
const ADMIN_COUNTRY_CODE = process.env['ADMIN_COUNTRY_CODE'] ?? 'US';

async function seedAdminAccount(): Promise<void> {
  const db = createDatabaseClientFromEnv();

  try {
    await db.query(
      `INSERT INTO institutions (
         id, name, legal_name, registration_number, tier, country_code, status
       ) VALUES ($1, $2, $3, $4, 'tier1', $5, 'active')
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         legal_name = EXCLUDED.legal_name,
         country_code = EXCLUDED.country_code,
         status = 'active',
         updated_at = NOW()`,
      [
        ADMIN_INSTITUTION_ID,
        ADMIN_INSTITUTION_NAME,
        `${ADMIN_INSTITUTION_NAME} LLC`,
        `UAT-${ADMIN_INSTITUTION_ID.slice(0, 8).toUpperCase()}`,
        ADMIN_COUNTRY_CODE.toUpperCase(),
      ],
    );

    await db.query(
      `INSERT INTO trading_limits (
         institution_id, daily_limit_usd, single_trade_min_usd, single_trade_max_usd
       ) VALUES ($1, 0, 1, 1000000)
       ON CONFLICT (institution_id) DO UPDATE SET
         daily_limit_usd = EXCLUDED.daily_limit_usd,
         single_trade_min_usd = EXCLUDED.single_trade_min_usd,
         single_trade_max_usd = EXCLUDED.single_trade_max_usd,
         updated_at = NOW()`,
      [ADMIN_INSTITUTION_ID],
    );

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await db.query(
      `INSERT INTO users (
         institution_id, email, password_hash, first_name, last_name, role,
         is_active, has_verified_email, has_enabled_mfa
       ) VALUES ($1, $2, $3, $4, $5, 'operations', true, true, false)
       ON CONFLICT (email) DO UPDATE SET
         institution_id = EXCLUDED.institution_id,
         password_hash = EXCLUDED.password_hash,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         role = 'operations',
         is_active = true,
         has_verified_email = true,
         has_enabled_mfa = false,
         updated_at = NOW()`,
      [
        ADMIN_INSTITUTION_ID,
        ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        ADMIN_FIRST_NAME,
        ADMIN_LAST_NAME,
      ],
    );

    process.stdout.write(
      [
        'Admin UAT account is ready.',
        `Email: ${ADMIN_EMAIL.toLowerCase()}`,
        `Password: ${ADMIN_PASSWORD}`,
        `Institution ID: ${ADMIN_INSTITUTION_ID}`,
        "Role: operations (admin approval privileges)",
      ].join('\n') + '\n',
    );
  } finally {
    await db.end();
  }
}

seedAdminAccount().catch((err: unknown) => {
  process.stderr.write(`Failed to seed admin account: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
