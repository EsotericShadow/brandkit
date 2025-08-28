import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BasicsStep from '@/components/GuideGenerator/steps/BasicsStep_vrf';

// Mock FileReader for logo preview
class MockFileReader {
  public result: string | ArrayBuffer | null = null;
  public onloadend: null | (() => void) = null;
  readAsDataURL(file: Blob) {
    this.result = 'data:image/png;base64,MOCKED';
    if (this.onloadend) this.onloadend();
  }
}
(Object.assign(globalThis as any, { FileReader: MockFileReader }));

const makeInputs = () => ({
  brandName: '',
  industry: 'Technology',
  logoUrl: undefined,
  hasExistingTagline: undefined,
  existingTagline: '',
  mission: '',
  audience: '',
  toneTraits: [],
  palette: {},
});

const Harness: React.FC<{ onNext?: () => void }> = ({ onNext = () => {} }) => {
  const [inputs, setInputs] = React.useState<any>(makeInputs());
  return <BasicsStep userInputs={inputs} setUserInputs={setInputs} onNext={onNext} />;
};

describe('BasicsStep_test', () => {
  it('disables Next until required fields are present and calls onNext', () => {
    const onNext = vi.fn();

    render(<Harness onNext={onNext} />);

    const nextBtn1 = screen.getByRole('button', { name: /next/i });
    expect(nextBtn1).toBeDisabled();

    const nameInput = screen.getByLabelText(/Brand Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Acme Co' } });

    const nextBtn2 = screen.getByRole('button', { name: /next/i });
    expect(nextBtn2).not.toBeDisabled();

    fireEvent.click(nextBtn2);
    expect(onNext).toHaveBeenCalled();
  });

  it('updates industry select and shows logo preview after upload', async () => {
    render(<Harness />);

    const industry = screen.getByLabelText(/Industry/i) as HTMLSelectElement;
    fireEvent.change(industry, { target: { value: 'Healthcare' } });

    const fileInput = screen.getByLabelText(/Brand Logo/i) as HTMLInputElement;
    const file = new File(['dummy'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByAltText(/Logo preview/i)).toBeInTheDocument();
    });
  });
});

