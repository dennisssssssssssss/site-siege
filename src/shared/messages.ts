// Messages exchanged between the popup, the content script and the service worker.

export type TargetKind = 'image' | 'media' | 'link' | 'button' | 'text' | 'ad';

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

export type UpgradeId = 'blastRadius' | 'chainReaction';
export type ShopItem = UpgradeId | 'drone';

export type Wallet = {
  coins: number;
  upgrades: Record<UpgradeId, number>;
  drones: number;
};

// What the popup needs to draw one Armory card.
export type ArmoryItem = {
  id: ShopItem;
  icon: string;
  name: string;
  description: string;
  next: string | null;
  owned: number;
  max: number;
  price: number | null;
  consumable: boolean;
};

export type ArmoryView = { coins: number; items: ArmoryItem[] };
export type BuyResponse = { ok: boolean; armory: ArmoryView };

export type Request =
  | { type: 'PING' }
  | { type: 'SCAN' }
  | { type: 'GET_STATE' }
  | { type: 'GET_STATS' }
  | { type: 'GET_WALLET' }
  | { type: 'BUY'; item: ShopItem }
  | { type: 'SIEGE_START' }
  | { type: 'SIEGE_STOP' }
  | { type: 'RESTORE' };

export type PingResponse = { ok: true; title: string; host: string };
