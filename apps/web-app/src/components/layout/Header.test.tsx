import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from './Header';

const mockLogout = jest.fn();
const mockUser = {
  id: 'a10e8400-e29b-41d4-a716-446655440001',
  email: 'admin@example.com',
  role: 'admin' as const,
  institutionId: null,
  mfaEnabled: false,
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

jest.mock('next/link', () => {
  const Link = ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Header', () => {
  it('renders the logo with home link', () => {
    render(<Header />);
    const logo = screen.getByRole('link', { name: /carbon trading platform home/i });
    expect(logo).toHaveAttribute('href', '/dashboard');
  });

  it('renders the menu toggle button', () => {
    render(<Header />);
    expect(
      screen.getByRole('button', { name: /toggle navigation menu/i }),
    ).toBeInTheDocument();
  });

  it('calls onMenuToggle when toggle button is clicked', () => {
    const onMenuToggle = jest.fn();
    render(<Header onMenuToggle={onMenuToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('shows notification button with no badge when count is 0', () => {
    render(<Header notificationCount={0} />);
    expect(
      screen.getByRole('button', { name: /no notifications/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows notification badge with count when notificationCount > 0', () => {
    render(<Header notificationCount={5} />);
    expect(
      screen.getByRole('button', { name: /5 notifications/i }),
    ).toBeInTheDocument();
  });

  it('renders user email in the user menu', () => {
    render(<Header />);
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('opens user menu dropdown on button click', () => {
    render(<Header />);
    const userMenuButton = screen.getByRole('button', { name: /user menu for/i });
    fireEvent.click(userMenuButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('calls logout when Sign out is clicked', async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<Header />);
    fireEvent.click(screen.getByRole('button', { name: /user menu for/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });
});
