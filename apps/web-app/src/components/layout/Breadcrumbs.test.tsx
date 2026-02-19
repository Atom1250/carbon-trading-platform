import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Breadcrumbs } from './Breadcrumbs';

const mockPathname = jest.fn();

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

describe('Breadcrumbs', () => {
  it('shows only Home on the dashboard root', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<Breadcrumbs />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('shows Home and a labelled segment on one-level deep path', () => {
    mockPathname.mockReturnValue('/dashboard/trading');
    render(<Breadcrumbs />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    const current = screen.getByText('Trading');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('shows intermediate links and final current for nested paths', () => {
    mockPathname.mockReturnValue('/dashboard/compliance/review');
    render(<Breadcrumbs />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compliance' })).toBeInTheDocument();
    const current = screen.getByText('review');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('uses raw segment as label when no mapping exists', () => {
    mockPathname.mockReturnValue('/dashboard/unknown-section');
    render(<Breadcrumbs />);
    expect(screen.getByText('unknown-section')).toBeInTheDocument();
  });

  it('renders a nav element with Breadcrumb accessible label', () => {
    mockPathname.mockReturnValue('/dashboard/assets');
    render(<Breadcrumbs />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('renders separators between crumbs', () => {
    mockPathname.mockReturnValue('/dashboard/ledger');
    render(<Breadcrumbs />);
    expect(screen.getByText('/')).toBeInTheDocument();
  });
});
