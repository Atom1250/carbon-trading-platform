import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default variant by default', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('applies primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText('Primary');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('applies success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('applies danger variant', () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText('Danger');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('accepts additional className', () => {
    render(<Badge className="extra-class">Classy</Badge>);
    const badge = screen.getByText('Classy');
    expect(badge).toHaveClass('extra-class');
  });
});
