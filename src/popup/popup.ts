import type { PingRequest, PingResponse } from '../shared/messages';

const hostEl = document.querySelector<HTMLElement>('#target-host')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;

function setStatus(text: string, kind: 'ok' | 'warn') {
  statusEl.textContent = text;
  statusEl.className = `status status--${kind}`;
}

async function connect() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) {
    setStatus('No active tab.', 'warn');
    return;
  }

  try {
    const request: PingRequest = { type: 'PING' };
    const response: PingResponse = await chrome.tabs.sendMessage(tab.id, request);
    hostEl.textContent = response.host;
    setStatus('Page connected. Ready to siege.', 'ok');
  } catch {
    // Content scripts don't run on chrome:// pages, the Web Store, or tabs opened before install.
    setStatus('Can\'t reach this page. Reload it, or try a normal website.', 'warn');
  }
}

connect();
