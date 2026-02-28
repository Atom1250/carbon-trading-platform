import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const middlewarePath = resolve(process.cwd(), 'apps/web-app/src/middleware.ts');
const source = readFileSync(middlewarePath, 'utf8');

const checks = [
  {
    ok: source.includes('pathname.startsWith("/_next")'),
    message: 'Missing _next exclusion in middleware.',
  },
  {
    ok: source.includes('pathname.startsWith("/api")'),
    message: 'Missing /api exclusion in middleware.',
  },
  {
    ok: source.includes('pathname === "/figma" || pathname.startsWith("/figma/")'),
    message: 'Missing explicit /figma-only handling.',
  },
  {
    ok: !source.includes('/figma${pathname}'),
    message: 'Unsafe global rewrite to /figma detected.',
  },
  {
    ok: source.includes('return NextResponse.next();'),
    message: 'Expected pass-through for non-figma routes.',
  },
];

const failures = checks.filter((c) => !c.ok);
if (failures.length > 0) {
  console.error('Middleware safety guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure.message}`);
  }
  process.exit(1);
}

console.log('Middleware safety guard passed.');
