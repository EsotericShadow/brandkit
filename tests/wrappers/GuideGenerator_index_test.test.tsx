import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GuideGenerator from '@/components/GuideGenerator/index_vrf';

vi.mock('@/services/aiClient_vrf', () => ({
  generateGuide: vi.fn(async () => ({
    brandName: 'Acme',
    industry: 'Technology',
    logoUrl: undefined,
    mission: 'Our mission',
    elevatorPitch: 'Elevator pitch',
    audience: 'Our audience',
    tone: { traits: ['Professional'], description: 'Tone description', dosAndDonts: { dos: ['Do one'], donts: ["Don't one"] } },
    palette: { primary: '#112233', background: '#ffffff' },
    taglines: [{ tagline: 'Tagline A', rationale: 'Because...' }],
  })),
}));

describe('GuideGenerator/index_test', () => {
  it('shows welcome and moves to Basics on Get Started', () => {
    const onGuideGenerated = vi.fn();
    const onReset = vi.fn();
    render(<GuideGenerator onGuideGenerated={onGuideGenerated} initialGuide={null} onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(screen.getByLabelText(/Brand Name/i)).toBeInTheDocument();
  });

  it('can generate a guide end-to-end with mocked service', async () => {
    const onGuideGenerated = vi.fn();
    render(<GuideGenerator onGuideGenerated={onGuideGenerated} initialGuide={null} onReset={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.click(screen.getByRole('button', { name: /no, i need ideas/i }));
    fireEvent.change(screen.getByPlaceholderText(/empower creative/i), { target: { value: 'Our mission' } });
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.change(screen.getByPlaceholderText(/freelance graphic designers/i), { target: { value: 'Our audience' } });
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));
    fireEvent.click(screen.getByRole('button', { name: /professional/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    // Set primary color to enable generation
    const primaryHex = screen.getByLabelText(/primary hex code/i);
    fireEvent.change(primaryHex, { target: { value: '#112233' } });
    fireEvent.blur(primaryHex);

    fireEvent.click(screen.getByRole('button', { name: /generate guide/i }));

    await waitFor(() => {
      expect(onGuideGenerated).toHaveBeenCalled();
    });
  });
});

