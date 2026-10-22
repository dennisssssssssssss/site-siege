// The global wallet (one for every website) and the Armory shop.
import type { ArmoryItem, ArmoryView, ShopItem, TargetKind, UpgradeId, Wallet } from '../shared/messages';
import { HP } from './scanner';
import { read, update } from './storage';

const KEY = 'wallet';
const EMPTY: Wallet = { coins: 0, upgrades: { blastRadius: 0, chainReaction: 0 }, drones: 0 };

// Index = upgrade level. Level 0 means not bought.
export const BLAST_RADIUS = [0, 40, 80, 120];
export const CHAIN_CHANCE = [0, 0.15, 0.3, 0.45];
export const MAX_DRONES = 3;

export const coinsFor = (kind: TargetKind) => Math.ceil(HP[kind] / 5);

type Upgrade = { icon: string; name: string; prices: number[]; effects: string[] };

const UPGRADES: Record<UpgradeId, Upgrade> = {
  blastRadius: {
    icon: '💥',
    name: 'Blast Radius',
    prices: [150, 400, 900],
    effects: BLAST_RADIUS.slice(1).map((px) => `Every kill also wrecks stuff within ${px}px`),
  },
  chainReaction: {
    icon: '⛓️',
    name: 'Chain Reaction',
    prices: [200, 500, 1100],
    effects: CHAIN_CHANCE.slice(1).map((p) => `${p * 100}% chance a kill sets off its neighbour`),
  },
};

const DRONE = { icon: '🤖', name: 'Drone', price: 100 };

export const loadWallet = () => read(KEY, EMPTY);

export const updateWallet = (change: (wallet: Wallet) => Wallet) => update(KEY, EMPTY, change);

function priceOf(item: ShopItem, wallet: Wallet): number | null {
  if (item === 'drone') return wallet.drones < MAX_DRONES ? DRONE.price : null;
  return UPGRADES[item].prices[wallet.upgrades[item]] ?? null;
}

export function armoryView(wallet: Wallet): ArmoryView {
  const upgrades = (Object.keys(UPGRADES) as UpgradeId[]).map((id): ArmoryItem => {
    const { icon, name, prices, effects } = UPGRADES[id];
    const level = wallet.upgrades[id];
    return {
      id,
      icon,
      name,
      description: level > 0 ? effects[level - 1] : 'Not unlocked yet',
      next: effects[level] ?? null,
      owned: level,
      max: prices.length,
      price: priceOf(id, wallet),
      consumable: false,
    };
  });

  const drone: ArmoryItem = {
    id: 'drone',
    icon: DRONE.icon,
    name: DRONE.name,
    description: 'Press Q in a siege: it hunts targets on its own for 15s',
    next: null,
    owned: wallet.drones,
    max: MAX_DRONES,
    price: priceOf('drone', wallet),
    consumable: true,
  };

  return { coins: wallet.coins, items: [...upgrades, drone] };
}

export async function buy(item: ShopItem): Promise<{ ok: boolean; wallet: Wallet }> {
  let ok = false;
  const wallet = await updateWallet((current) => {
    const price = priceOf(item, current);
    if (price === null || current.coins < price) return current;

    ok = true;
    const coins = current.coins - price;
    if (item === 'drone') return { ...current, coins, drones: current.drones + 1 };
    return { ...current, coins, upgrades: { ...current.upgrades, [item]: current.upgrades[item] + 1 } };
  });
  return { ok, wallet };
}
