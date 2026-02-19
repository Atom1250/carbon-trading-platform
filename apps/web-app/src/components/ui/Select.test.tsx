import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Select } from './Select';

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders with placeholder', () => {
    render(<Select options={options} placeholder="Choose..." />);
    expect(screen.getByText('Choose...')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select options={options} label="Country" />);
    expect(screen.getByText('Country')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Select options={options} disabled />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
  });

  it('displays error message when error prop is provided', () => {
    render(<Select options={options} label="Field" error="Required field" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
    expect(trigger).toHaveClass('border-danger-500');
  });

  it('calls onValueChange when selection changes', () => {
    const handleChange = jest.fn();
    render(<Select options={options} onValueChange={handleChange} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    // After clicking trigger, options should appear in portal
    const option1 = screen.getByText('Option 1');
    fireEvent.click(option1);
    expect(handleChange).toHaveBeenCalledWith('1');
  });
});
