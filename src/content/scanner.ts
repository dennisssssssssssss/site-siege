import type { LevelReport, TargetKind } from '../shared/messages';

export const HP: Record<TargetKind, number> = {
  image: 30,
  link: 10,
  button: 20,
  ad: 50,
};

// Class or id words that usually mark an ad slot, e.g. "ad", "ad-banner", "sponsored_box".
const AD_WORD = /(^|[\s_-])(ads?|advert|advertisement|sponsor|sponsored|banner)([\s_-]|$)/i;
const AD_IFRAME_SRC = /doubleclick|googlesyndication|adservice|adnxs|taboola|outbrain/i;

const CANDIDATES = [
  'img',
  'picture',
  'video',
  'a[href]',
  'button',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[role="button"]',
  'ins.adsbygoogle',
  'iframe',
  '[id*="ad" i]',
  '[class*="ad" i]',
  '[id*="sponsor" i]',
  '[class*="sponsor" i]',
  '[id*="banner" i]',
  '[class*="banner" i]',
].join(',');

function isAd(el: Element): boolean {
  if (el.matches('ins.adsbygoogle')) return true;
  if (el instanceof HTMLIFrameElement && AD_IFRAME_SRC.test(el.src)) return true;

  const words = `${el.id} ${typeof el.className === 'string' ? el.className : ''}`;
  if (!AD_WORD.test(words)) return false;

  // Ignore tiny elements whose class happens to contain an ad word.
  const rect = el.getBoundingClientRect();
  return rect.width >= 50 && rect.height >= 30;
}

export function classify(el: Element): TargetKind | null {
  if (isAd(el)) return 'ad';
  if (el.matches('img, picture, video')) return 'image';
  if (el.matches('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')) {
    return 'button';
  }
  if (el.matches('a[href]')) return 'link';
  return null;
}

export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

// Walks up from the element under the cursor to the nearest visible target.
export function findTarget(start: Element | null): { el: Element; kind: TargetKind } | null {
  for (let el = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const kind = classify(el);
    if (kind && isVisible(el)) return { el, kind };
  }
  return null;
}

export function scanPage(): LevelReport {
  const counts: Record<TargetKind, number> = { image: 0, link: 0, button: 0, ad: 0 };

  for (const el of document.querySelectorAll(CANDIDATES)) {
    const kind = classify(el);
    if (kind && isVisible(el)) counts[kind]++;
  }

  const totalHp = (Object.keys(counts) as TargetKind[]).reduce((sum, kind) => sum + counts[kind] * HP[kind], 0);
  return { host: location.host, counts, totalHp };
}
