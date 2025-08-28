import type { FontSourceLink } from './fonts_vrf';

// Additional official sources/licensing pages for popular families
// These augment Google Fonts specimen pages shown by default.
export function extraSourceLinks(name: string): FontSourceLink[] {
  const key = name.trim().toLowerCase();
  const out: FontSourceLink[] = [];
  const push = (label: string, url: string, source: FontSourceLink['source'] = 'Foundry') => out.push({ label, url, source });

  switch (key) {
    case 'league spartan':
      push('The League of Moveable Type — League Spartan', 'https://www.theleagueofmoveabletype.com/league-spartan');
      break;
    case 'archivo black':
    case 'archivo narrow':
    case 'chivo':
      push('Omnibus-Type — Family page', 'https://www.omnibus-type.com/');
      break;
    case 'kanit':
      push('Cadson Demak — Kanit', 'https://www.cadsondemak.com/typeface/kanit');
      break;
    case 'teko':
      push('Indian Type Foundry — Teko', 'https://www.indiantypefoundry.com/fonts/teko');
      break;
    case 'oswald':
      push('Google Fonts GitHub — Oswald (Vernon Adams et al.)', 'https://github.com/googlefonts/OswaldFont');
      break;
    case 'abril fatface':
      push('TypeTogether — Abril', 'https://www.type-together.com/abril');
      break;
    case 'dm serif display':
      push('Colophon / Google — DM Serif Display (GitHub)', 'https://github.com/googlefonts/dm-fonts');
      break;
    case 'cinzel':
      push('Natanael Gama — Cinzel', 'https://www.nstypefoundry.com/Typefaces/Cinzel');
      break;
    case 'manrope':
      push('Manrope Project — Official site', 'https://manropefont.com/');
      break;
    case 'montserrat':
      push('Julieta Ulanovsky — Montserrat (GitHub)', 'https://github.com/JulietaUla/Montserrat');
      break;
    case 'poppins':
      push('Indian Type Foundry — Poppins', 'https://www.indiantypefoundry.com/fonts/poppins');
      break;
    case 'plus jakarta sans':
      push('Tokotype — Plus Jakarta Sans', 'https://tokotype.github.io/PlusJakartaSans/');
      break;
    case 'work sans':
      push('Wei Huang — Work Sans (GitHub)', 'https://github.com/weiweihuanghuang/Work-Sans');
      break;
    case 'urbanist':
      push('Coretype — Urbanist (GitHub)', 'https://github.com/core-type/Urbanist');
      break;
    case 'exo 2':
      push('Natanael Gama — Exo 2', 'https://www.nstypefoundry.com/Typefaces/Exo-2');
      break;
    case 'ibm plex sans':
    case 'ibm plex serif':
    case 'ibm plex mono':
      push('IBM Plex — Official (GitHub)', 'https://github.com/ibm/plex');
      break;
    case 'spectral':
      push('Production Type — Spectral', 'https://www.productiontype.com/family/spectral');
      break;
    case 'literata':
      push('TypeTogether — Literata', 'https://www.type-together.com/literata');
      break;
    case 'eb garamond':
      push('EB Garamond — Project (GitHub)', 'https://github.com/octaviopardo/EBGaramond12');
      break;
    case 'libre baskerville':
      push('Impallari — Libre Baskerville (GitHub)', 'https://github.com/impallari/Libre-Baskerville');
      break;
    case 'yanone kaffeesatz':
      push('Yanone — Kaffeesatz', 'https://yanone.de/fonts/kaffeesatz/');
      break;
    case 'bowlby one':
    case 'bowlby one sc':
      push('Vernon Adams — Bowlby (GitHub mirror)', 'https://github.com/google/fonts/tree/main/ofl/bowlbyone');
      break;
    case 'bungee':
    case 'bungee inline':
    case 'bungee shade':
    case 'bungee hairline':
      push('David Jonathan Ross — Bungee', 'https://djr.com/bungee/');
      break;
    case 'black ops one':
      push('Sorkin Type — Black Ops One (GitHub)', 'https://github.com/google/fonts/tree/main/ofl/blackopsone');
      break;
    default:
      break;
  }
  return out;
}

