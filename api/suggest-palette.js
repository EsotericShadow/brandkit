// Lightweight palette suggestion API for Vercel
// Accepts POST JSON body with UserInputs and optional ?roles=... query.
// Returns a map of role -> hex color. This mirrors the client’s expectations.

function parseBody(req) {
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (req.body) return req.body;
  } catch (e) {}
  return {};
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function parseHex(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return { r, g, b };
}

function toHex({ r, g, b }) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, (h / 360) + 1/3);
    g = hue2rgb(p, q, (h / 360));
    b = hue2rgb(p, q, (h / 360) - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function adjustHue(hex, delta) {
  const rgb = parseHex(hex) || { r: 0x1d, g: 0x4e, b: 0xd8 };
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return toHex(hslToRgb(h + delta, s, l));
}

function adjustSaturation(hex, mul) {
  const rgb = parseHex(hex) || { r: 0x1d, g: 0x4e, b: 0xd8 };
  let { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  s = clamp01(s * mul);
  return toHex(hslToRgb(h, s, l));
}

function adjustLightness(hex, delta) {
  const rgb = parseHex(hex) || { r: 0x1d, g: 0x4e, b: 0xd8 };
  let { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  l = clamp01(l + delta);
  return toHex(hslToRgb(h, s, l));
}

function relativeLuminance({ r, g, b }) {
  const chan = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(hexA, hexB) {
  const a = parseHex(hexA) || { r: 0, g: 0, b: 0 };
  const b = parseHex(hexB) || { r: 255, g: 255, b: 255 };
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  const [br, dr] = la > lb ? [la, lb] : [lb, la];
  return (br + 0.05) / (dr + 0.05);
}

function bestTextOn(bgHex) {
  const black = '#000000', white = '#ffffff';
  const cBlack = contrastRatio(black, bgHex);
  const cWhite = contrastRatio(white, bgHex);
  return cBlack >= cWhite ? black : white;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const inputs = parseBody(req);
  const q = req.query || {};
  const rolesCsv = typeof q.roles === 'string' ? q.roles : '';
  const roles = rolesCsv
    ? rolesCsv.split(',').map(s => s.trim()).filter(Boolean)
    : (Array.isArray(inputs?.palette) ? Object.keys(inputs.palette) : null) || ['primary','background','text','link'];

  const current = (inputs && typeof inputs === 'object' && inputs.palette && typeof inputs.palette === 'object') ? inputs.palette : {};
  const primary = typeof current.primary === 'string' ? current.primary : '#1d4ed8';
  const background = typeof current.background === 'string' ? current.background : '#ffffff';
  let text = typeof current.text === 'string' ? current.text : bestTextOn(background);

  // Derive link from primary but ensure contrast vs background
  let link = typeof current.link === 'string' ? current.link : primary;
  // Nudge hue and saturation to ensure distinctness
  link = adjustSaturation(link, 1.15);
  link = adjustHue(link, -8);
  // Adjust lightness based on bg
  const bgLum = relativeLuminance(parseHex(background) || { r:255,g:255,b:255 });
  link = adjustLightness(link, bgLum >= 0.5 ? -0.12 : 0.12);
  // Ensure at least 4.5:1 contrast
  let safety = 0;
  while (contrastRatio(link, background) < 4.5 && safety < 8) {
    link = bgLum >= 0.5 ? adjustLightness(link, -0.08) : adjustLightness(link, 0.08);
    safety++;
  }

  const out = {};
  for (const role of roles) {
    const key = String(role);
    if (key.toLowerCase() === 'primary') out[key] = primary;
    else if (key.toLowerCase() === 'background') out[key] = background;
    else if (key.toLowerCase() === 'text') out[key] = text;
    else if (key.toLowerCase() === 'link') out[key] = link;
    else if (key.toLowerCase() === 'accent') {
      // Accent: +40° hue shift, slight sat boost
      out[key] = adjustSaturation(adjustHue(primary, 40), 1.05);
    } else if (key.toLowerCase() === 'secondary') {
      // Secondary: -20° hue shift, slight sat reduce
      out[key] = adjustSaturation(adjustHue(primary, -20), 0.95);
    } else if (key.toLowerCase() === 'neutrallight') {
      // Neutral light: near-background but slightly tinted towards primary hue
      const p = parseHex(primary) || { r: 51, g: 102, b: 204 };
      const { h } = rgbToHsl(p.r, p.g, p.b);
      const neutral = hslToRgb(h, 0.05, 0.92);
      out[key] = toHex(neutral);
    } else if (key.toLowerCase() === 'neutraldark') {
      const p = parseHex(primary) || { r: 51, g: 102, b: 204 };
      const { h } = rgbToHsl(p.r, p.g, p.b);
      const neutral = hslToRgb(h, 0.08, 0.12);
      out[key] = toHex(neutral);
    } else {
      // Unknown role: default to primary
      out[key] = primary;
    }
  }

  res.status(200).json(out);
};

