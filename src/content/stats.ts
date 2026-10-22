// Per-website stats, kept in chrome.storage.local under "stats:<host>".
import type { SiteStats } from '../shared/messages';

const EMPTY: SiteStats = { sieges: 0, destroyed: 0, bestScore: 0, lastPlayed: null };

const keyFor = (host: string) => `stats:${host}`;

export async function loadStats(host: string): Promise<SiteStats> {
  const key = keyFor(host);
  const stored = await chrome.storage.local.get(key);
  return { ...EMPTY, ...(stored[key] as Partial<SiteStats> | undefined) };
}

// Updates run one after another, so fast clicks can't overwrite each other's changes.
let queue: Promise<unknown> = Promise.resolve();

export function updateStats(host: string, change: (stats: SiteStats) => SiteStats): Promise<SiteStats> {
  const next = queue.then(async () => {
    const stats = change(await loadStats(host));
    await chrome.storage.local.set({ [keyFor(host)]: stats });
    return stats;
  });
  queue = next.catch(() => {});
  return next;
}
