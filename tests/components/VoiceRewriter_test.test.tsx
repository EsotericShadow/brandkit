import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoiceRewriter from '@/components/VoiceRewriter_vrf';

vi.mock('@/services/aiClient_vrf', () => ({
  rewriteText: vi.fn(async (txt: string) => `REWRITE:${txt}`),
  checkConsistency: vi.fn(async () => ({ score: 80, feedback: 'Good', suggestions: ['Do A', 'Do B'] })),
}));

describe('VoiceRewriter_test', () => {
  it('disables actions without input and shows report after analyze', async () => {
    const guide: any = { brandName: 'Acme', tone: { traits: ['Friendly'] } };
    render(<VoiceRewriter brandGuide={guide} />);

    const analyze = screen.getByRole('button', { name: /Analyze Consistency/i });
    const rewrite = screen.getByRole('button', { name: /Rewrite Text/i });
    expect(analyze).toBeDisabled();
    expect(rewrite).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Your Text/i), { target: { value: 'Hello' } });
    expect(analyze).not.toBeDisabled();
    expect(rewrite).not.toBeDisabled();

    fireEvent.click(analyze);
    await waitFor(() => {
      expect(screen.getByText(/Consistency Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/Alignment Score/i)).toBeInTheDocument();
    });
  });
});

