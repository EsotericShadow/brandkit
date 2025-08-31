export type GenerateInputs = any;
export type BrandGuide = any;

const PROVIDER = 'gemini';

// Configurable API base and robustness controls via Vite env
const VITE = (import.meta as any).env || {};
const IS_TEST = !!(VITE && (VITE as any).VITEST);
const API_BASE: string = (VITE.VITE_API_BASE || '').toString().replace(/\/$/, '');
// In tests, use a very short fallback timeout so generateGuide doesn't hang waiting for the
// orchestration event. This is validated by vitest runs.
const DEFAULT_TIMEOUT_MS: number = Number(VITE.VITE_AI_TIMEOUT_MS || (IS_TEST ? 25 : 60000));
const DEFAULT_RETRIES: number = Number(VITE.VITE_API_RETRIES || 2);

function makeUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

async function postJson<T>(path: string, body: any, opts?: { timeoutMs?: number; retries?: number }): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = (opts?.retries ?? DEFAULT_RETRIES) + 1; // attempts = 1 + retries
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(makeUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await (res.text().catch(() => ''));
        const baseMsg = path.includes('generate-guide') ? 'Failed to generate guide' : 'Request failed';
        throw new Error(`${baseMsg}: ${res.status}${text ? ` — ${text}` : ''}`);
      }
      return res.json() as Promise<T>;
    } catch (e: any) {
      lastError = e;
      const isAbort = e?.name === 'AbortError';
      const isNetworkLike = typeof e?.message === 'string' && /(NetworkError|Failed to fetch|ECONNREFUSED|ENOTFOUND)/i.test(e.message);
      const retryable = isAbort || isNetworkLike;
      if (attempt < maxAttempts - 1 && retryable) {
        const backoff = Math.min(2000 * Math.pow(2, attempt), 8000); // 2s, 4s, 8s cap
        await new Promise(r => setTimeout(r, backoff));
        attempt++;
        continue;
      }
      if (isAbort) throw new Error('Request timed out');
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error('Unknown request failure');
}

export async function generateGuide(inputs: GenerateInputs): Promise<BrandGuide> {
  // Trigger live orchestration overlay (WebSocket-based)
  try {
    window.dispatchEvent(new CustomEvent('orchestration:start', { detail: { provider: PROVIDER, inputs } }));
  } catch {}
  // Wait for final via event, with timeout fallback to HTTP
  return new Promise<BrandGuide>((resolve, reject) => {
    let done = false;
    const onFinal = (e: any) => {
      if (done) return;
      done = true;
      try { window.removeEventListener('orchestration:final' as any, onFinal as any); } catch {}
      resolve(e.detail as BrandGuide);
    };
    window.addEventListener('orchestration:final' as any, onFinal as any, { once: true } as any);
    // Fallback: timeout then use HTTP endpoint
    const t = setTimeout(async () => {
      if (done) return;
      try {
        const viaHttp = await postJson<BrandGuide>('/api/generate-guide', { provider: PROVIDER, inputs });
        done = true; resolve(viaHttp);
      } catch (err) {
        done = true; reject(err);
      } finally {
        try { window.removeEventListener('orchestration:final' as any, onFinal as any); } catch {}
      }
    }, DEFAULT_TIMEOUT_MS);
  });
}

export interface RewriteOptions {
  aggressiveness?: number; // 1..5 (1 = conservative, 5 = bold)
  keepLength?: boolean;
  preserveStructure?: boolean;
  notes?: string; // optional extra guidance
}

export async function rewriteText(text: string, guide: BrandGuide, options?: RewriteOptions): Promise<string> {
  // Server expects { textToRewrite, brandGuide, options? }
  const out = await postJson<{ text: string }>('/api/rewrite', { provider: PROVIDER, textToRewrite: text, brandGuide: guide, options });
  return out.text;
}

export async function checkConsistency(text: string, guide: BrandGuide): Promise<any> {
  // Server expects { textToCheck, brandGuide }
  return postJson<any>('/api/consistency', { provider: PROVIDER, textToCheck: text, brandGuide: guide });
}

export async function suggestPalette(inputs: GenerateInputs): Promise<Record<string, string>> {
  // Server expects the bare UserInputs object (not wrapped in { inputs })
  return postJson<Record<string, string>>('/api/suggest-palette', inputs);
}

// Curated default roles for brand palettes
export const DEFAULT_PALETTE_ROLES = [
  'primary',
  'secondary',
  'accent',
  'background',
  'text',
  'link',
] as const;

export type PaletteSuggestOptions = {
  seed?: number;
  preset?: 'subtle' | 'balanced' | 'bold';
  model?: string; // e.g., 'gemini:gemini-2.5-flash' or 'openai:gpt-4o-mini'
};

export async function suggestPaletteWithRoles(
  inputs: GenerateInputs,
  roles: readonly string[] = DEFAULT_PALETTE_ROLES,
  opts?: PaletteSuggestOptions,
): Promise<Record<string, string>> {
  const params = new URLSearchParams();
  if (roles && roles.length) params.set('roles', roles.join(','));
  if (typeof opts?.seed === 'number') params.set('seed', String(opts.seed));
  if (opts?.preset) params.set('preset', opts.preset);
  if (opts?.model) params.set('model', opts.model);
  const path = `/api/suggest-palette${params.toString() ? `?${params.toString()}` : ''}`;
  return postJson<Record<string, string>>(path, inputs);
}
