import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from '@/components/common/Button_vrf';

describe('Button_test', () => {
  it('renders with variant and size classes and disabled state', () => {
    const { rerender } = render(<Button variant="primary" size="sm">Go</Button>);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('bg-neutral-900');

    rerender(<Button variant="secondary" size="lg" disabled>Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn).toHaveClass('bg-neutral-200');
    expect(btn).toHaveClass('px-6');
    expect(btn).toBeDisabled();
  });
});

