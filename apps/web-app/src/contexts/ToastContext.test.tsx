import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from './ToastContext';

function TestComponent() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Info message')}>Show Info</button>
    </div>
  );
}

describe('ToastContext', () => {
  it('shows success toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show Success'));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveTextContent('Success message');
    expect(toast).toHaveClass('bg-success-600');
  });

  it('shows error toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show Error'));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveTextContent('Error message');
    expect(toast).toHaveClass('bg-danger-600');
  });

  it('shows info toast by default', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show Info'));
    const toast = screen.getByRole('alert');
    expect(toast).toHaveTextContent('Info message');
    expect(toast).toHaveClass('bg-primary-600');
  });

  it('removes toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close notification' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('auto-removes toast after timeout', async () => {
    jest.useFakeTimers();

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('throws error when useToast is used outside ToastProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    function InvalidComponent() {
      useToast();
      return null;
    }

    expect(() => render(<InvalidComponent />)).toThrow(
      'useToast must be used within ToastProvider',
    );

    spy.mockRestore();
  });
});
