'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BREADCRUMB_LABELS } from './nav-items';

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = BREADCRUMB_LABELS[segment] ?? segment;
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol className="breadcrumbs__list" role="list">
        <li className="breadcrumbs__item">
          <Link href="/dashboard" className="breadcrumbs__link">
            Home
          </Link>
        </li>
        {crumbs
          .filter((c) => c.href !== '/dashboard')
          .map((crumb) => (
            <li key={crumb.href} className="breadcrumbs__item">
              <span className="breadcrumbs__separator" aria-hidden="true">
                /
              </span>
              {crumb.isLast ? (
                <span className="breadcrumbs__current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="breadcrumbs__link">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
      </ol>
    </nav>
  );
}
