import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateGuide, rewriteText, checkConsistency, suggestPalette } from '@/services/aiClient_vrf';

const mockFetch = vi.fn();

describe('services/aiClient_test', () => {
  const provider = 'gemini';

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch as any);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generateGuide calls correct endpoint and returns BrandGuide', async () => {
    const guide = { brandName: 'Acme', industry: 'Tech' } as any;
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => guide });

    const res = await generateGuide({ brandName: 'Acme', industry: 'Tech' } as any);
    expect(res).toEqual(guide);
    expect(mockFetch).toHaveBeenCalledWith('/api/generate-guide', expect.objectContaining({ method: 'POST' }));
    const [, init] = mockFetch.mock.calls[0];
    expect((init as any).headers['Content-Type']).toBe('application/json');
    expect(JSON.parse((init as any).body)).toMatchObject({ provider, inputs: { brandName: 'Acme' } });
  });

  it('rewriteText posts payload and returns text', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'rewritten' }) });
    const out = await rewriteText('hello', { brandName: 'Acme' } as any);
    expect(out).toBe('rewritten');
    expect(mockFetch).toHaveBeenCalledWith('/api/rewrite', expect.anything());
  });

  it('checkConsistency returns report', async () => {
    const report = { score: 0.9 } as any;
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => report });
    const out = await checkConsistency('copy', { brandName: 'Acme' } as any);
    expect(out).toEqual(report);
    expect(mockFetch).toHaveBeenCalledWith('/api/consistency', expect.anything());
  });

  it('suggestPalette returns palette', async () => {
    const palette = { primary: '#112233' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => palette });
    const out = await suggestPalette({ industry: 'Tech' } as any);
    expect(out).toEqual(palette);
    expect(mockFetch).toHaveBeenCalledWith('/api/suggest-palette', expect.anything());
  });

  it('throws informative errors on non-OK responses', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });
    await expect(generateGuide({} as any)).rejects.toThrow(/Failed to generate guide: 500/);
  });
});

