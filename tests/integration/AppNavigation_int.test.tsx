import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from '@/App_vrf';

// Shared mocks
class MockIntersectionObserver { observe() {} disconnect() {} }
(Object.assign(globalThis as any, { IntersectionObserver: MockIntersectionObserver }));

const minimalGuide = {
  brandName: 'Acme',
  industry: 'Technology',
  logoUrl: undefined,
  mission: 'Our mission',
  elevatorPitch: 'Elevator pitch',
  audience: 'Our audience',
  tone: { traits: ['Professional'], description: 'Tone description', dosAndDonts: { dos: ['Do one'], donts: ["Don't one"] } },
  palette: { primary: '#112233', background: '#ffffff' },
  taglines: [{ tagline: 'Tagline A', rationale: 'Because...' }],
};

function setupWithGuideInStorage() {
  localStorage.setItem('brandGuide', JSON.stringify(minimalGuide));
  return render(<App />);
}

describe('App integration — navigation, persistence, editing', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });


  it('enables Voice Rewriter and Font Library after guide exists and switches views', async () => {
    setupWithGuideInStorage();

    const voiceBtn = screen.getByRole('button', { name: /voice rewriter/i });
    const fontsBtn = screen.getByRole('button', { name: /font library/i });

    expect(voiceBtn).not.toBeDisabled();
    expect(fontsBtn).not.toBeDisabled();

    fireEvent.click(voiceBtn);
    await screen.findByText(/Voice Rewriter for/i);

    fireEvent.click(fontsBtn);
    await screen.findByRole('heading', { name: /Font Library/i });
  });

  it('persists the generated guide and hydrates on reload', async () => {
    vi.mock('@/services/aiClient_vrf', () => ({
      generateGuide: vi.fn(async () => minimalGuide),
    }));

    // Walk a minimal path to generation
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    const nameInput = screen.getByLabelText(/brand name/i);
    fireEvent.change(nameInput, { target: { value: 'Acme' } });
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
      expect(screen.getByText(/Acme Style Guide/i)).toBeInTheDocument();
    });

    // Simulate reload and verify navigation is enabled (persistence)
    cleanup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voice rewriter/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /font library/i })).not.toBeDisabled();
    });
  });

  it('allows editing the guide in GuideView and saving changes', async () => {
    // Generate guide first to avoid timing issues with hydration
    vi.mock('@/services/aiClient_vrf', () => ({
      generateGuide: vi.fn(async () => minimalGuide),
    }));
    render(<App />);
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
      expect(screen.getByText(/Acme Style Guide/i)).toBeInTheDocument();
    });

    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Update Mission section (EditableSection textarea appears)
    const missionTextarea = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement;
    fireEvent.change(missionTextarea, { target: { value: 'Updated mission statement' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Mission content displays updated text
    await waitFor(() => {
      expect(screen.getByText(/Updated mission statement/i)).toBeInTheDocument();
    });
  });
});

