import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '@/components/common/Card_vrf';

describe('Card_test', () => {
  it('renders title, description, icon and children', () => {
    render(
      <Card title="T" description="D" icon={<span data-testid="icon" />}>Body</Card>
    );
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

