import type { SiegeState, TargetKind, Wallet } from '../shared/messages';
import { coinsFor, loadWallet, updateWallet } from './armory';
import { loadStats, updateStats } from './stats';
import { HP, isVisible, targetAt } from './scanner';
import overlayCss from './overlay.css?inline';

type Styled = Element & ElementCSSInlineStyle;

const COLORS: Record<TargetKind, string> = {
  image: '#ffb547',
  media: '#b48cff',
  link: '#4da3ff',
  button: '#3ddc97',
  text: '#c3c9d6',
  ad: '#ff3b5c',
};

// Inline visibility each destroyed element had before, so Restore can put it back exactly.
const destroyed = new Map<Styled, { value: string; priority: string }>();

let active = false;
let score = 0;
let best = 0;
// Local copy of the wallet so the HUD updates instantly; every change is also saved.
let wallet: Wallet = { coins: 0, upgrades: { blastRadius: 0, chainReaction: 0 }, drones: 0 };
let host: HTMLElement | null = null;
let root: ShadowRoot | null = null;
let highlight: HTMLElement | null = null;
let hud: HTMLElement | null = null;
let cursorStyle: HTMLStyleElement | null = null;
let shieldLayer: HTMLElement | null = null;
let shieldTimer: number | undefined;
let hovered: { el: Element; kind: TargetKind } | null = null;

export function getState(): SiegeState {
  return { active, destroyed: destroyed.size, score };
}

export function startSiege() {
  if (active) return;
  active = true;
  mountOverlay();

  updateStats(location.host, (stats) => ({ ...stats, sieges: stats.sieges + 1, lastPlayed: Date.now() }));
  loadStats(location.host).then((stats) => {
    best = Math.max(best, stats.bestScore);
    renderHud();
  });
  reloadWallet();

  window.addEventListener('mousemove', onMouseMove, true);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('keydown', onKeyDown, true);
  for (const type of BLOCKED_EVENTS) window.addEventListener(type, onPointer, true);

  refreshShields();
  // Iframes come and go (lazy embeds, live chat), so keep the shields in sync.
  shieldTimer = window.setInterval(refreshShields, 500);
}

export function stopSiege() {
  if (!active) return;
  active = false;
  hovered = null;

  window.removeEventListener('mousemove', onMouseMove, true);
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('keydown', onKeyDown, true);
  for (const type of BLOCKED_EVENTS) window.removeEventListener(type, onPointer, true);
  window.clearInterval(shieldTimer);

  host?.remove();
  cursorStyle?.remove();
  host = root = highlight = hud = cursorStyle = shieldLayer = null;
}

// Called after a purchase in the popup, so a running siege sees the new upgrades.
export function reloadWallet() {
  loadWallet().then((saved) => {
    wallet = saved;
    renderHud();
  });
}

export function restorePage(): number {
  const count = destroyed.size;
  for (const [el, previous] of destroyed) {
    if (previous.value) el.style.setProperty('visibility', previous.value, previous.priority);
    else el.style.removeProperty('visibility');
  }
  destroyed.clear();
  score = 0;
  renderHud();
  return count;
}

// Events the page must not see for a target we are shooting, or links would navigate.
const BLOCKED_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'auxclick'] as const;

function onPointer(event: Event) {
  const { clientX, clientY } = event as MouseEvent;
  const target = targetAt(clientX, clientY, host);
  if (!target) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.type === 'click') destroy(target.el, target.kind);
}

function onMouseMove(event: MouseEvent) {
  hovered = targetAt(event.clientX, event.clientY, host);
  updateHighlight();
}

function onScroll() {
  updateHighlight();
  refreshShields();
}

// Mouse events inside an iframe never reach this page, so during a siege each visible
// iframe gets an invisible shield on top that catches the hover and the shot instead.
function refreshShields() {
  if (!shieldLayer) return;
  const shields: HTMLElement[] = [];

  for (const frame of document.querySelectorAll('iframe')) {
    if (!isVisible(frame)) continue;
    const rect = frame.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) continue;

    const shield = document.createElement('div');
    shield.className = 'shield';
    Object.assign(shield.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    shield.addEventListener('wheel', (e) => window.scrollBy(e.deltaX, e.deltaY), { passive: true });
    shields.push(shield);
  }
  shieldLayer.replaceChildren(...shields);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    stopSiege();
  }
}

function destroy(el: Element, kind: TargetKind) {
  const styled = el as Styled;
  const rect = el.getBoundingClientRect();

  destroyed.set(styled, {
    value: styled.style.getPropertyValue('visibility'),
    priority: styled.style.getPropertyPriority('visibility'),
  });
  styled.style.setProperty('visibility', 'hidden', 'important');

  score += HP[kind];
  best = Math.max(best, score);
  updateStats(location.host, (stats) => ({
    ...stats,
    destroyed: stats.destroyed + 1,
    bestScore: Math.max(stats.bestScore, score),
  }));

  const coins = coinsFor(kind);
  wallet = { ...wallet, coins: wallet.coins + coins };
  updateWallet((saved) => ({ ...saved, coins: saved.coins + coins }));

  hovered = null;
  updateHighlight();
  refreshShields();
  renderHud();
  explode(rect, kind);
}

function mountOverlay() {
  host = document.createElement('site-siege-root');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = overlayCss;

  highlight = document.createElement('div');
  highlight.className = 'highlight';
  highlight.append(document.createElement('span'));
  highlight.firstElementChild!.className = 'tag';

  hud = document.createElement('div');
  hud.className = 'hud';

  shieldLayer = document.createElement('div');

  root.append(style, shieldLayer, highlight, hud);
  document.documentElement.append(host);

  cursorStyle = document.createElement('style');
  cursorStyle.textContent = '* { cursor: crosshair !important; }';
  document.head.append(cursorStyle);

  renderHud();
}

function updateHighlight() {
  if (!highlight) return;
  if (!hovered || !hovered.el.isConnected) {
    highlight.style.display = 'none';
    return;
  }

  const rect = hovered.el.getBoundingClientRect();
  Object.assign(highlight.style, {
    display: 'block',
    left: `${rect.left - 3}px`,
    top: `${rect.top - 3}px`,
    width: `${rect.width + 6}px`,
    height: `${rect.height + 6}px`,
  });
  highlight.style.setProperty('--color', COLORS[hovered.kind]);
  highlight.firstElementChild!.textContent = `${hovered.kind.toUpperCase()} · ${HP[hovered.kind]} HP`;
}

function renderHud() {
  if (!hud) return;
  hud.replaceChildren(
    span('title', 'SITE SIEGE'),
    span('', `Score ${score}`),
    span(score > 0 && score >= best ? 'record' : '', `Best ${best}`),
    span('', `Destroyed ${destroyed.size}`),
    span('coins', `🪙 ${wallet.coins.toLocaleString()}`),
    span('hint', 'ESC to exit'),
  );
}

function span(className: string, text: string) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

function explode(rect: DOMRect, kind: TargetKind) {
  if (!root) return;
  const color = COLORS[kind];
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const ring = document.createElement('div');
  ring.className = 'ring';
  Object.assign(ring.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderColor: color,
  });
  root.append(ring);
  ring.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.25)', opacity: 0 },
    ],
    { duration: 350, easing: 'ease-out' },
  ).onfinish = () => ring.remove();

  const spread = Math.min(160, 40 + Math.max(rect.width, rect.height) / 2);
  for (let i = 0; i < 16; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    Object.assign(particle.style, { left: `${cx}px`, top: `${cy}px`, background: color });
    root.append(particle);

    const angle = Math.random() * Math.PI * 2;
    const distance = spread * (0.5 + Math.random() * 0.5);
    particle.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0) rotate(${Math.random() * 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 500 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' },
    ).onfinish = () => particle.remove();
  }

  floatText(`+${HP[kind]}`, cx - 14, cy, '');
  floatText(`+${coinsFor(kind)}🪙`, cx + 22, cy, 'coin');
}

function floatText(text: string, x: number, y: number, className: string) {
  if (!root) return;
  const el = span(`points ${className}`, text);
  Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
  root.append(el);
  el.animate(
    [
      { transform: 'translate(-50%, -50%)', opacity: 1 },
      { transform: 'translate(-50%, -260%)', opacity: 0 },
    ],
    { duration: 800, easing: 'ease-out' },
  ).onfinish = () => el.remove();
}
