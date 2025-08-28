import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditableSection from '@/components/common/EditableSection_vrf';

describe('EditableSection_test', () => {
  it('shows textarea in editing mode and read view otherwise', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EditableSection title="Title" content="Body" onChange={onChange} isEditing={false} />
    );
    expect(screen.getByText('Body')).toBeInTheDocument();

    rerender(<EditableSection title="Title" content="Body" onChange={onChange} isEditing={true} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

