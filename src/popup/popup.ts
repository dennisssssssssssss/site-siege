import type { LevelReport, PingResponse, Request, SiegeState, SiteStats, TargetKind } from '../shared/messages';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

const hostEl = $('#target-host');
const statusEl = $('#status');
const reportEl = $('#report');
const totalHpEl = $('#total-hp');
const progressEl = $('#progress');
const siegeBtn = $<HTMLButtonElement>('#siege');
const scanBtn = $<HTMLButtonElement>('#scan');
const restoreBtn = $<HTMLButtonElement>('#restore');

let tabId: number | undefined;
let state: SiegeState = { active: false, destroyed: 0, score: 0 };

function send<T>(request: Request): Promise<T> {
  return chrome.tabs.sendMessage(tabId!, request);
}

function setStatus(text: string, kind: 'ok' | 'warn') {
  statusEl.textContent = text;
  statusEl.className = `status status--${kind}`;
}

function renderReport(report: LevelReport) {
  for (const kind of Object.keys(report.counts) as TargetKind[]) {
    $(`#count-${kind}`).textContent = String(report.counts[kind]);
  }
  totalHpEl.textContent = `${report.totalHp.toLocaleString()} HP`;
  reportEl.hidden = false;
}

function renderState() {
  siegeBtn.textContent = state.active ? 'Stop siege' : 'Start siege';
  restoreBtn.disabled = state.destroyed === 0;
  progressEl.hidden = state.destroyed === 0;
  progressEl.textContent = `Destroyed ${state.destroyed} · Score ${state.score}`;
}

async function renderRecord() {
  // An older content script (page not reloaded after an update) doesn't know GET_STATS.
  const stats = await send<SiteStats>({ type: 'GET_STATS' }).catch(() => null);
  if (!stats || stats.sieges === 0) return;
  $('#best-score').textContent = stats.bestScore.toLocaleString();
  $('#total-destroyed').textContent = stats.destroyed.toLocaleString();
  $('#sieges').textContent = String(stats.sieges);
  $('#record').hidden = false;
}

async function scan() {
  renderReport(await send<LevelReport>({ type: 'SCAN' }));
}

async function connect() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  if (tabId === undefined) {
    setStatus('No active tab.', 'warn');
    return;
  }

  try {
    const ping = await send<PingResponse>({ type: 'PING' });
    hostEl.textContent = ping.host;
    state = await send<SiegeState>({ type: 'GET_STATE' });
    await Promise.all([scan(), renderRecord()]);
  } catch {
    // Content scripts don't run on chrome:// pages, the Web Store, or tabs opened before install.
    setStatus('Can\'t reach this page. Reload it, or try a normal website.', 'warn');
    return;
  }

  setStatus(state.active ? 'Siege in progress.' : 'Page connected. Ready to siege.', 'ok');
  siegeBtn.disabled = scanBtn.disabled = false;
  renderState();
}

siegeBtn.addEventListener('click', async () => {
  if (state.active) {
    state = await send<SiegeState>({ type: 'SIEGE_STOP' });
    renderState();
    return;
  }
  await send<SiegeState>({ type: 'SIEGE_START' });
  // Close the popup so the player lands straight on the page.
  window.close();
});

scanBtn.addEventListener('click', scan);

restoreBtn.addEventListener('click', async () => {
  state = await send<SiegeState>({ type: 'RESTORE' });
  renderState();
  await scan();
});

connect();
