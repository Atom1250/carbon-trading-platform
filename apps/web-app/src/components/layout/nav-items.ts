import type { User } from '@/lib/api';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'grid' },
  { label: 'Trading', href: '/dashboard/trading', icon: 'trending-up' },
  { label: 'Assets', href: '/dashboard/assets', icon: 'package' },
  { label: 'Institutions', href: '/dashboard/institutions', icon: 'building' },
  { label: 'Compliance', href: '/dashboard/compliance', icon: 'shield' },
  { label: 'Ledger', href: '/dashboard/ledger', icon: 'book' },
  { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
];

const TRADER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'grid' },
  { label: 'Trading', href: '/dashboard/trading', icon: 'trending-up' },
  { label: 'Assets', href: '/dashboard/assets', icon: 'package' },
];

const COMPLIANCE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'grid' },
  { label: 'Compliance', href: '/dashboard/compliance', icon: 'shield' },
  { label: 'Assets', href: '/dashboard/assets', icon: 'package' },
  { label: 'Reporting', href: '/dashboard/reporting', icon: 'bar-chart' },
];

export function getNavItems(role: User['role']): NavItem[] {
  switch (role) {
    case 'admin':
      return ADMIN_NAV;
    case 'compliance':
      return COMPLIANCE_NAV;
    case 'trader':
    default:
      return TRADER_NAV;
  }
}

export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  trading: 'Trading',
  assets: 'Assets',
  institutions: 'Institutions',
  compliance: 'Compliance',
  ledger: 'Ledger',
  settings: 'Settings',
  reporting: 'Reporting',
};
