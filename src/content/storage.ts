// Small wrapper around chrome.storage.local. Writes run one after another, so fast updates
// (rapid kills, chain reactions) can't overwrite each other's changes.

let queue: Promise<unknown> = Promise.resolve();

export async function read<T extends object>(key: string, fallback: T): Promise<T> {
  const stored = await chrome.storage.local.get(key);
  return { ...fallback, ...(stored[key] as Partial<T> | undefined) };
}

export function update<T extends object>(key: string, fallback: T, change: (value: T) => T): Promise<T> {
  const next = queue.then(async () => {
    const value = change(await read(key, fallback));
    await chrome.storage.local.set({ [key]: value });
    return value;
  });
  queue = next.catch(() => {});
  return next;
}
