import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App_vrf';

vi.mock('@/services/aiClient_vrf', () => ({
  generateGuide: vi.fn(async (inputs: any) => ({
    brandName: inputs.brandName || 'Acme',
    industry: inputs.industry || 'Technology',
    logoUrl: undefined,
    mission: inputs.mission || 'Our mission',
    elevatorPitch: 'Elevator pitch',
    audience: inputs.audience || 'Our audience',
    tone: {
      traits: inputs.toneTraits || ['Professional'],
      description: 'Tone description',
      dosAndDonts: { dos: ['Do one'], donts: ["Don't one"] },
    },
    palette: { primary: '#112233', background: '#ffffff' },
    taglines: [{ tagline: 'Tagline A', rationale: 'Because...' }],
  })),
}));

// Minimal IO mock if something relies on it (not strictly necessary here)
class MockIntersectionObserver {
  observe() {}
  disconnect() {}
}
(Object.assign(globalThis as any, { IntersectionObserver: MockIntersectionObserver }));

function typeInto(labelOrPlaceholder: RegExp, value: string) {
  const input = screen.queryByLabelText(labelOrPlaceholder) || screen.getByPlaceholderText(labelOrPlaceholder);
  fireEvent.change(input as HTMLInputElement, { target: { value } });
}

describe('App integration — guide generation flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('walks through steps and shows the generated guide', async () => {
    render(<App />);

    // Welcome
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));

    // Basics
    typeInto(/brand name/i, 'Acme');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Tagline: choose "No, I need ideas" (auto-advances)
    fireEvent.click(screen.getByRole('button', { name: /no, i need ideas/i }));

    // Mission
    typeInto(/empower creative/i, 'To empower creators.');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Audience
    typeInto(/freelance graphic designers/i, 'Designers and agencies.');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Tone
    fireEvent.click(screen.getByRole('button', { name: /professional/i }));
    fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

    // Palette -> set primary then Generate
    const primaryHex = screen.getByLabelText(/primary hex code/i);
    fireEvent.change(primaryHex, { target: { value: '#112233' } });
    fireEvent.blur(primaryHex);

    fireEvent.click(screen.getByRole('button', { name: /generate guide/i }));

    await waitFor(() => {
      expect(screen.getByText(/Acme Style Guide/i)).toBeInTheDocument();
      expect(screen.getByText(/Color Palette/i)).toBeInTheDocument();
    });
  });
});

