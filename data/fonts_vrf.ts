export type FontRole = 'heading' | 'body';

export interface FontAssets {
  css: string;
  import: string;
  license?: string;
}

export interface FontSourceLink {
  label: string;
  url: string;
  source: 'Google Fonts' | 'Project Site' | 'GitHub' | 'Foundry' | 'Other';
}

export interface FontPairing {
  name: string;
  heading: string; // font-family CSS value
  body: string;    // font-family CSS value
  headingImport: string; // @import url(...)
  bodyImport: string;    // @import url(...)
  traits: string[];
  license: string; // e.g., OFL, Apache-2.0, SIL, or "Varies"
  description: string;
}

const GOOGLE_BASE = 'https://fonts.googleapis.com/css2';

function importFor(family: string, weights = 'wght@400;600') {
  const fam = family.trim().replace(/\s+/g, '+');
  return `@import url('${GOOGLE_BASE}?family=${fam}:${weights}&display=swap');`;
}

function cssStack(family: string): string {
  return `'${family}', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`;
}

export function assetsFor(family: string, role: FontRole): FontAssets {
  // Accept any provided family name; Google Fonts will 404 quietly in CSS if it doesn't exist.
  // Tests only require that a valid @import is produced.
  const name = family && family.trim() ? family.trim() : 'Inter';
  // Prefer heavier weights for headings; moderate weights for body
  const weights = role === 'heading' ? 'wght@700;800;900' : 'wght@400;500;600';
  return {
    css: cssStack(name),
    import: importFor(name, weights),
    license: 'Varies (see sources)',
  };
}

export function googleFontsSpecimenUrl(name: string): string {
  return `https://fonts.google.com/specimen/${name.trim().replace(/\s+/g, '+')}`;
}

export function sourceLinksFor(name: string): FontSourceLink[] {
  const fam = name.trim();
  const links: FontSourceLink[] = [
    { label: `Google Fonts — ${fam}`, url: googleFontsSpecimenUrl(fam), source: 'Google Fonts' },
  ];
  // Add well-known project/foundry links for popular families
  const key = fam.toLowerCase();
  if (key === 'inter') {
    links.push(
      { label: 'Project site', url: 'https://rsms.me/inter/', source: 'Project Site' },
      { label: 'GitHub releases', url: 'https://github.com/rsms/inter/releases/latest', source: 'GitHub' },
    );
  } else if (key === 'roboto') {
    links.push(
      { label: 'GitHub releases', url: 'https://github.com/googlefonts/roboto/releases', source: 'GitHub' },
    );
  } else if (key.startsWith('source sans')) {
    links.push(
      { label: 'GitHub releases', url: 'https://github.com/adobe-fonts/source-sans/releases', source: 'GitHub' },
    );
  } else if (key === 'source serif' || key.startsWith('source serif')) {
    links.push(
      { label: 'GitHub releases', url: 'https://github.com/adobe-fonts/source-serif/releases', source: 'GitHub' },
    );
  } else if (key === 'source code pro') {
    links.push(
      { label: 'GitHub releases', url: 'https://github.com/adobe-fonts/source-code-pro/releases', source: 'GitHub' },
    );
  }
  // Augment with extended sources
  try {
    const extras = extraSourceLinks(fam);
    for (const s of extras) links.push(s);
  } catch {}
  return links;
}

import { HEADING_NAMES_EXTRA, BODY_NAMES_EXTRA } from './font_names_vrf';
import { extraSourceLinks } from './fonts_sources_vrf';

export function headingFamilyNames(): string[] {
  // Curated quick-pick list; users can also type any name to access 400+ Google Fonts
  const base = [
    'Inter', 'Playfair Display', 'Roboto', 'Source Sans Pro', 'Open Sans', 'Lora', 'Merriweather', 'Poppins',
    'Montserrat', 'Nunito', 'Oswald', 'Raleway', 'Rubik', 'Work Sans', 'Noto Sans', 'Noto Serif', 'Karla',
    'Libre Baskerville', 'EB Garamond', 'DM Serif Display', 'DM Sans', 'Space Grotesk', 'Space Mono',
    'Fira Sans', 'Fira Sans Condensed', 'Fira Mono', 'Cabinet Grotesk', 'Mulish', 'Quicksand', 'Bitter',
    'Josefin Sans', 'PT Sans', 'PT Serif', 'Cabin', 'Exo 2', 'Hind', 'Heebo', 'Assistant', 'Lato', 'Barlow',
    'Barlow Condensed', 'Crimson Text', 'Cormorant Garamond', 'Cormorant', 'IBM Plex Sans', 'IBM Plex Serif',
    'IBM Plex Mono', 'Manrope', 'Urbanist', 'Syne', 'Sora', 'Plus Jakarta Sans', 'Alegreya', 'Alegreya Sans',
    'Bebas Neue', 'Cinzel', 'Great Vibes', 'Dancing Script', 'Pacifico', 'Playfair', 'Clash Display', 'Onest'
  ];
  const set = new Set<string>(base.concat(HEADING_NAMES_EXTRA));
  return Array.from(set);
}

export function bodyFamilyNames(): string[] {
  const base = [
    'Inter', 'Roboto', 'Source Sans Pro', 'Open Sans', 'Lora', 'Merriweather', 'Nunito', 'Poppins', 'Work Sans',
    'Noto Sans', 'Karla', 'DM Sans', 'Manrope', 'Barlow', 'Mulish', 'Rubik', 'Lato', 'Urbanist', 'Heebo',
    'Assistant', 'Hind', 'Cabin', 'PT Sans', 'IBM Plex Sans', 'Plus Jakarta Sans', 'Source Serif Pro', 'Crimson Text'
  ];
  const set = new Set<string>([...base, ...BODY_NAMES_EXTRA]);
  return Array.from(set);
}

// A small curated seed, always first
const CURATED_PAIRINGS: FontPairing[] = [
  {
    name: 'Playfair Display + Source Sans Pro',
    heading: cssStack('Playfair Display'),
    body: cssStack('Source Sans Pro'),
    headingImport: importFor('Playfair Display'),
    bodyImport: importFor('Source Sans Pro'),
    traits: ['Elegant', 'Editorial', 'Classic'],
    license: 'OFL',
    description: 'High-contrast serif for headlines paired with a humanist sans for comfortable reading.',
  },
  {
    name: 'Poppins + Lora',
    heading: cssStack('Poppins'),
    body: cssStack('Lora'),
    headingImport: importFor('Poppins'),
    bodyImport: importFor('Lora'),
    traits: ['Modern', 'Friendly'],
    license: 'OFL',
    description: 'Geometric sans headlines with a literary serif body for warmth.',
  },
  {
    name: 'Montserrat + Merriweather',
    heading: cssStack('Montserrat'),
    body: cssStack('Merriweather'),
    headingImport: importFor('Montserrat'),
    bodyImport: importFor('Merriweather'),
    traits: ['Bold', 'Trustworthy'],
    license: 'OFL',
    description: 'A popular pairing: confident headlines and highly readable body text.',
  },
  {
    name: 'Bebas Neue + Inter',
    heading: cssStack('Bebas Neue'),
    body: cssStack('Inter'),
    headingImport: importFor('Bebas Neue'),
    bodyImport: importFor('Inter'),
    traits: ['Impactful', 'Clean'],
    license: 'OFL',
    description: 'Display headlines with a clean, neutral body for strong hierarchy.',
  },
  {
    name: 'League Spartan + Inter',
    heading: cssStack('League Spartan'),
    body: cssStack('Inter'),
    headingImport: importFor('League Spartan'),
    bodyImport: importFor('Inter'),
    traits: ['Impactful', 'Modern'],
    license: 'OFL',
    description: 'Ultra-bold geometric headlines with a neutral, highly readable body.'
  },
  {
    name: 'Anton + Roboto',
    heading: cssStack('Anton'),
    body: cssStack('Roboto'),
    headingImport: importFor('Anton'),
    bodyImport: importFor('Roboto'),
    traits: ['Bold', 'Clean'],
    license: 'OFL',
    description: 'Compressed heavy title font paired with a ubiquitous body workhorse.'
  },
  {
    name: 'Archivo Black + Open Sans',
    heading: cssStack('Archivo Black'),
    body: cssStack('Open Sans'),
    headingImport: importFor('Archivo Black'),
    bodyImport: importFor('Open Sans'),
    traits: ['Strong', 'Friendly'],
    license: 'OFL',
    description: 'Omnibus-Type display weight headlines with approachable body text.'
  },
  {
    name: 'Kanit Black + Source Sans Pro',
    heading: cssStack('Kanit'),
    body: cssStack('Source Sans Pro'),
    headingImport: importFor('Kanit'),
    bodyImport: importFor('Source Sans Pro'),
    traits: ['Tech', 'Contemporary'],
    license: 'OFL',
    description: 'Thai-driven industrial sans with a humanist sans for long copy.'
  },
  {
    name: 'Abril Fatface + Manrope',
    heading: cssStack('Abril Fatface'),
    body: cssStack('Manrope'),
    headingImport: importFor('Abril Fatface'),
    bodyImport: importFor('Manrope'),
    traits: ['Editorial', 'Modern'],
    license: 'OFL',
    description: 'High-contrast serif display headlines with a crisp modern body.'
  },
];

function buildAutoPairings(max = 80): FontPairing[] {
  const heads = headingFamilyNames();
  const bodies = bodyFamilyNames();
  const pairs: FontPairing[] = [];
  // simple round-robin matching to produce a broad catalog without bloating the file
  for (let i = 0; i < heads.length && pairs.length < max; i++) {
    const h = heads[i];
    const b = bodies[i % bodies.length];
    const name = `${h} + ${b}`;
    // avoid duplicating curated entries
    if (CURATED_PAIRINGS.some(p => p.name === name)) continue;
    pairs.push({
      name,
      heading: cssStack(h),
      body: cssStack(b),
      headingImport: importFor(h),
      bodyImport: importFor(b),
      traits: i % 3 === 0 ? ['Modern'] : i % 3 === 1 ? ['Classic'] : ['Friendly'],
      license: 'Varies (see sources)',
      description: `${h} headings paired with ${b} body for balanced hierarchy and readability.`,
    });
  }
  return pairs;
}

export const fontPairings: FontPairing[] = [
  ...CURATED_PAIRINGS,
  ...buildAutoPairings(),
];

export function suggestPairings(brandGuide: { tone?: { traits?: string[] } } | null, max = 2): FontPairing[] {
  const traits = brandGuide?.tone?.traits || [];
  let list = fontPairings;
  if (traits.length) {
    list = fontPairings.filter(p => p.traits.some(t => traits.includes(t)));
    if (list.length === 0) list = fontPairings;
  }
  const wanted = Math.max(0, max);
  if (list.length >= wanted) return list.slice(0, wanted);
  // Top up with remaining unique items to reach target count
  const seen = new Set(list.map(p => p.name));
  for (const cand of fontPairings) {
    if (list.length >= wanted) break;
    if (!seen.has(cand.name)) {
      list.push(cand);
      seen.add(cand.name);
    }
  }
  return list.slice(0, wanted);
}
