export type PrimaryExtractionResult = {
  primaryHex: string | null;
  bgIsWhite: boolean;
};

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

function toHex(n: number): string { return Math.round(n).toString(16).padStart(2, '0'); }
function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isNearWhite(r: number, g: number, b: number, threshold = 245): boolean {
  return r >= threshold && g >= threshold && b >= threshold;
}

function isNearBlack(r: number, g: number, b: number, threshold = 15): boolean {
  return r <= threshold && g <= threshold && b <= threshold;
}

export async function extractPrimaryFromImage(
  imageUrl: string,
  options?: { maxSize?: number; minAlpha?: number; ignoreNearWhite?: boolean; whiteThreshold?: number }
): Promise<PrimaryExtractionResult> {
  const maxSize = options?.maxSize ?? 64;
  const minAlpha = options?.minAlpha ?? 128;
  const ignoreNearWhite = options?.ignoreNearWhite ?? true;
  const whiteThresh = options?.whiteThreshold ?? 245; // 0..255 channel threshold for near-white

  return new Promise<PrimaryExtractionResult>((resolve) => {
    try {
      const img = new Image();
      // Allow data URLs without CORS; external URLs may require CORS headers
      if (!/^data:/i.test(imageUrl)) img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) return resolve({ primaryHex: null, bgIsWhite: false });
          const scale = Math.min(1, maxSize / Math.max(w, h));
          const sw = Math.max(1, Math.round(w * scale));
          const sh = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = sw; canvas.height = sh;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve({ primaryHex: null, bgIsWhite: false });
          ctx.drawImage(img, 0, 0, sw, sh);
          const data = ctx.getImageData(0, 0, sw, sh).data;

          const bins = new Map<number, number>();
          let whitePixels = 0; let totalPixels = 0;
          // Quantize to 5 bits/channel => 32 levels; pack into 15 bits
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]; const g = data[i+1]; const b = data[i+2]; const a = data[i+3];
            if (a < minAlpha) continue;
            totalPixels++;
            if (isNearWhite(r, g, b, whiteThresh)) { whitePixels++; if (ignoreNearWhite) continue; }
            if (isNearBlack(r, g, b)) continue; // ignore near-black glyphs
            const rq = r >> 3; const gq = g >> 3; const bq = b >> 3; // 0..31
            const key = (rq << 10) | (gq << 5) | bq;
            bins.set(key, (bins.get(key) ?? 0) + 1);
          }

          let bestKey: number | null = null; let bestCount = 0;
          for (const [key, count] of bins.entries()) {
            if (count > bestCount) { bestCount = count; bestKey = key; }
          }

          let primaryHex: string | null = null;
          if (bestKey != null) {
            const rq = (bestKey >> 10) & 31; const gq = (bestKey >> 5) & 31; const bq = bestKey & 31;
            // Convert quantized bin center back to 0..255 range
            const r = Math.min(255, Math.round((rq + 0.5) * 255 / 32));
            const g = Math.min(255, Math.round((gq + 0.5) * 255 / 32));
            const b = Math.min(255, Math.round((bq + 0.5) * 255 / 32));
            primaryHex = rgbToHex(r, g, b);
          }
          const bgIsWhite = totalPixels > 0 && whitePixels / totalPixels > 0.25; // 25%+ near-white -> likely white bg
          resolve({ primaryHex, bgIsWhite });
        } catch {
          resolve({ primaryHex: null, bgIsWhite: false });
        }
      };
      img.onerror = () => resolve({ primaryHex: null, bgIsWhite: false });
      img.src = imageUrl;
    } catch {
      resolve({ primaryHex: null, bgIsWhite: false });
    }
  });
}
