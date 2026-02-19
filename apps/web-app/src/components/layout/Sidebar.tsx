'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getNavItems } from './nav-items';
import type { User } from '@/lib/api';

interface SidebarProps {
  user: User;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ user, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(user.role);

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}
      aria-label="Main navigation"
    >
      <nav>
        <ul role="list">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onClose}
                >
                  <span className={`sidebar__icon sidebar__icon--${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
