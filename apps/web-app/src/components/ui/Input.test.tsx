import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('displays error message and applies error styles', () => {
    render(<Input label="Password" error="Password is required" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Password is required');
    expect(input).toHaveClass('border-danger-500');
  });

  it('displays helper text when no error', () => {
    render(<Input label="Username" helperText="Must be unique" />);
    expect(screen.getByText('Must be unique')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Disabled" disabled />);
    expect(screen.getByLabelText('Disabled')).toBeDisabled();
  });

  it('calls onChange when value changes', () => {
    const handleChange = jest.fn();
    render(<Input label="Test" onChange={handleChange} />);
    const input = screen.getByLabelText('Test');
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies success state styles', () => {
    render(<Input label="Success" state="success" />);
    expect(screen.getByLabelText('Success')).toHaveClass('border-success-500');
  });
});
