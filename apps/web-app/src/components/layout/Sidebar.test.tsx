import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from './Sidebar';
import type { User } from '@/lib/api';

const mockPathname = jest.fn(() => '/dashboard');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

jest.mock('next/link', () => {
  const Link = ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

function makeUser(role: User['role']): User {
  return {
    id: 'a10e8400-e29b-41d4-a716-446655440001',
    email: 'user@example.com',
    role,
    institutionId: null,
    mfaEnabled: false,
  };
}

describe('Sidebar — admin role', () => {
  it('shows all admin navigation items', () => {
    render(<Sidebar user={makeUser('admin')} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Trading')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Institutions')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('Ledger')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

describe('Sidebar — trader role', () => {
  it('shows only trader navigation items', () => {
    render(<Sidebar user={makeUser('trader')} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Trading')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.queryByText('Institutions')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});

describe('Sidebar — compliance role', () => {
  it('shows compliance and reporting items but not trading or institutions', () => {
    render(<Sidebar user={makeUser('compliance')} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('Reporting')).toBeInTheDocument();
    expect(screen.queryByText('Trading')).not.toBeInTheDocument();
    expect(screen.queryByText('Institutions')).not.toBeInTheDocument();
  });
});

describe('Sidebar — active state', () => {
  it('marks Dashboard as active when pathname is /dashboard', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<Sidebar user={makeUser('admin')} />);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  it('marks Trading as active when on trading path', () => {
    mockPathname.mockReturnValue('/dashboard/trading');
    render(<Sidebar user={makeUser('admin')} />);
    const tradingLink = screen.getByRole('link', { name: /trading/i });
    expect(tradingLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark Dashboard as active on sub-pages', () => {
    mockPathname.mockReturnValue('/dashboard/trading');
    render(<Sidebar user={makeUser('admin')} />);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
  });
});

describe('Sidebar — open/closed state', () => {
  it('renders with sidebar--open class when isOpen=true', () => {
    render(<Sidebar user={makeUser('trader')} isOpen={true} />);
    expect(screen.getByRole('complementary')).toHaveClass('sidebar--open');
  });

  it('renders with sidebar--closed class when isOpen=false', () => {
    render(<Sidebar user={makeUser('trader')} isOpen={false} />);
    expect(screen.getByRole('complementary')).toHaveClass('sidebar--closed');
  });
});
