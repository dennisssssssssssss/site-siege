// Per-website stats, kept under "stats:<host>".
import type { SiteStats } from '../shared/messages';
import { read, update } from './storage';

const EMPTY: SiteStats = { sieges: 0, destroyed: 0, bestScore: 0, lastPlayed: null };

const keyFor = (host: string) => `stats:${host}`;

export const loadStats = (host: string) => read(keyFor(host), EMPTY);

export const updateStats = (host: string, change: (stats: SiteStats) => SiteStats) =>
  update(keyFor(host), EMPTY, change);
