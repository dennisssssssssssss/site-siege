import type { LevelReport, TargetKind } from '../shared/messages';

export const HP: Record<TargetKind, number> = {
  image: 30,
  media: 40,
  link: 10,
  button: 20,
  text: 5,
  ad: 50,
};

// Class or id words that usually mark an ad slot, e.g. "ad", "ad-banner", "sponsored_box".
const AD_WORD = /(^|[\s_-])(ads?|advert|advertisement|sponsor|sponsored|banner)([\s_-]|$)/i;
// Custom element names used for ads, e.g. YouTube's <ytd-ad-slot-renderer>.
const AD_TAG = /(^|-)ads?(-|$)|promoted|sponsor/;
const AD_IFRAME_SRC = /doubleclick|googlesyndication|adservice|adnxs|taboola|outbrain/i;

// Buttons and everything else you press or type into.
const BUTTON = 'button, input:not([type="hidden"]), textarea, select, [role="button"]';
const MEDIA = 'video, iframe, canvas, embed, object';
const NO_TEXT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'TITLE']);

// How far above a piece of text we look for a link or button that should take the hit instead.
const TEXT_LOOKUP_DEPTH = 3;

const CANDIDATES = [
  'img',
  'picture',
  MEDIA,
  'a[href]',
  BUTTON,
  'ins.adsbygoogle',
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
  const isCustomTag = el.localName.includes('-');
  if (!AD_WORD.test(words) && !(isCustomTag && AD_TAG.test(el.localName))) return false;

  // Ignore tiny elements whose name happens to contain an ad word, and empty ad slots
  // (YouTube keeps one over the player even when no ad is running).
  const rect = el.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 30) return false;
  return Boolean(el.querySelector('img, iframe, video, canvas, a') || el.textContent?.trim());
}

function hasOwnText(el: Element): boolean {
  if (NO_TEXT.has(el.tagName)) return false;
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim().length > 1) return true;
  }
  return false;
}

export function classify(el: Element): TargetKind | null {
  if (isAd(el)) return 'ad';
  if (el.matches('img, picture')) return 'image';
  if (el.matches(MEDIA)) return 'media';
  if (el.matches(BUTTON)) return 'button';
  if (el.matches('a[href]')) return 'link';
  if (hasOwnText(el) && !coversScreen(el)) return 'text';
  return null;
}

// A wrapper with a stray word in it shouldn't let you wipe half the page in one click.
function coversScreen(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width * rect.height > 0.4 * innerWidth * innerHeight;
}

export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  // Also catches elements hidden through a parent, like a video player's faded-out controls.
  return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
}

type Target = { el: Element; kind: TargetKind };

// Walks up from an element to the nearest target. Plain text gives way to a link or button
// just above it, so clicking the words of a link hits the link.
export function findTarget(start: Element | null): Target | null {
  let text: Target | null = null;
  let depth = 0;

  for (let el = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (text && ++depth > TEXT_LOOKUP_DEPTH) return text;
    const kind = classify(el);
    if (!kind || !isVisible(el)) continue;
    if (kind !== 'text') return { el, kind };
    text ??= { el, kind };
  }
  return text;
}

// Looks through every layer under the point, so overlays (video controls, thumbnail hover
// layers) don't hide what's below them.
export function targetAt(x: number, y: number, ignore: Element | null): Target | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el === ignore) continue;
    const target = findTarget(el);
    if (target) return target;
  }
  return null;
}

function textElements(): Set<Element> {
  const found = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement && node.textContent!.trim().length > 1) found.add(node.parentElement);
  }
  return found;
}

export function scanPage(): LevelReport {
  const counts: Record<TargetKind, number> = { image: 0, media: 0, link: 0, button: 0, text: 0, ad: 0 };
  const elements = new Set([...document.querySelectorAll(CANDIDATES), ...textElements()]);

  // Count an element only when it is the target you'd hit by aiming at it,
  // so the words inside a link aren't counted twice.
  for (const el of elements) {
    const target = findTarget(el);
    if (target?.el === el) counts[target.kind]++;
  }

  const totalHp = (Object.keys(counts) as TargetKind[]).reduce((sum, kind) => sum + counts[kind] * HP[kind], 0);
  return { host: location.host, counts, totalHp };
}
