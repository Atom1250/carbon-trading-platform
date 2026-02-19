import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies different padding variants', () => {
    const { container, rerender } = render(<Card padding="none">No padding</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('p-0');

    rerender(<Card padding="lg">Large padding</Card>);
    expect(container.firstChild as HTMLElement).toHaveClass('p-6');
  });

  it('renders with header, content, and footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
