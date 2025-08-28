import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorSwatch from '@/components/GuideGenerator/ColorSwatch_vrf';

describe('ColorSwatch_test', () => {
  it('renders name and hex, and updates in editable mode', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColorSwatch name="primary" hex="#112233" isEditable={false} />);
    expect(screen.getByText(/primary/i)).toBeInTheDocument();
    expect(screen.getByText('#112233')).toBeInTheDocument();

    rerender(<ColorSwatch name="primary" hex="#112233" isEditable onChange={onChange} />);
    const inputs = screen.getAllByDisplayValue('#112233');
    const text = inputs.find(el => (el as HTMLInputElement).type === 'text') as HTMLInputElement;
    fireEvent.change(text, { target: { value: '#445566' } });
    expect(onChange).toHaveBeenCalledWith('#445566');
  });
});

