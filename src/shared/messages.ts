// Messages exchanged between the popup, the content script and the service worker.

export type TargetKind = 'image' | 'link' | 'button' | 'ad';

export type LevelReport = {
  host: string;
  counts: Record<TargetKind, number>;
  totalHp: number;
};

export type SiegeState = {
  active: boolean;
  destroyed: number;
  score: number;
};

export type SiteStats = {
  sieges: number;
  destroyed: number;
  bestScore: number;
  lastPlayed: number | null;
};

export type Request =
  | { type: 'PING' }
  | { type: 'SCAN' }
  | { type: 'GET_STATE' }
  | { type: 'GET_STATS' }
  | { type: 'SIEGE_START' }
  | { type: 'SIEGE_STOP' }
  | { type: 'RESTORE' };

export type PingResponse = { ok: true; title: string; host: string };
