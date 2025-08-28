import React from 'react';
import { render, screen } from '@testing-library/react';
import GuideView from '@/components/GuideGenerator/GuideView_vrf';

const guide = {
  brandName: 'Acme',
  industry: 'Technology',
  logoUrl: undefined,
  mission: 'Make things better',
  elevatorPitch: 'Fast, simple, powerful',
  audience: 'Designers and developers',
  tone: {
    traits: ['Friendly'],
    description: 'Clear and helpful',
    dosAndDonts: { dos: ['Be concise'], donts: ['Use jargon'] }
  },
  palette: { primary: '#ff0000', background: '#ffffff' },
  taglines: [ { tagline: 'Build better', rationale: 'Short and memorable' } ]
};

describe('GuideView_vrf', () => {
  it('renders key sections and actions', () => {
    render(
      <GuideView
        guide={guide as any}
        isEditing={false}
        onEditClick={() => {}}
        onCancelClick={() => {}}
        onSaveClick={() => {}}
        onReset={() => {}}
        downloadMarkdown={() => {}}
        handleEditableGuideChange={() => {}}
        handleEditableToneChange={() => {}}
        handleEditablePaletteChange={() => {}}
        handleTaglineChange={() => {}}
        handleDosAndDontsChange={() => {}}
      />
    );

    expect(screen.getByText('Acme Style Guide')).toBeInTheDocument();
    expect(screen.getByText('Color Palette')).toBeInTheDocument();
    expect(screen.getByText('Mission')).toBeInTheDocument();
    expect(screen.getByText('Audience')).toBeInTheDocument();
    expect(screen.getByText('Tone & Voice')).toBeInTheDocument();
    expect(screen.getByText("Dos and Don'ts")).toBeInTheDocument();
    expect(screen.getAllByText('Suggested Fonts').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Taglines')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});

