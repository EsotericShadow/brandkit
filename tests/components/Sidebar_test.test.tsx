import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '@/components/Sidebar_vrf';
import { AppView } from '@/types';

describe('Sidebar_test', () => {
  it('disables Voice Rewriter and Font Library until guide exists', () => {
    const setView = vi.fn();
    render(<Sidebar activeView={AppView.GUIDE_GENERATOR} setView={setView} isGuideGenerated={false} />);

    expect(screen.getByRole('button', { name: /voice rewriter/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /font library/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /palette generator/i }));
    expect(setView).toHaveBeenCalled();
  });

  it('enables Voice Rewriter when a guide exists and calls setView', () => {
    const setView = vi.fn();
    render(<Sidebar activeView={AppView.GUIDE_GENERATOR} setView={setView} isGuideGenerated={true} />);

    const vrBtn = screen.getByRole('button', { name: /voice rewriter/i });
    expect(vrBtn).not.toBeDisabled();
    fireEvent.click(vrBtn);
    expect(setView).toHaveBeenCalled();
  });
});

