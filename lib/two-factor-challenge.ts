const STORAGE_KEY = "hemma.twoFactorChallenge";

export type TwoFactorChallenge = {
  challengeToken: string;
  expiresAt: string;
  nextPath?: string | null;
};

// Cache so useSyncExternalStore receives a stable reference between snapshot
// reads — without it JSON.parse would return a fresh object each call and
// React would re-render every microtask.
let cachedRaw: string | null | undefined;
let cachedParsed: TwoFactorChallenge | null = null;

// Subscribers for useSyncExternalStore. Notified on cross-tab storage events
// AND on same-tab save/clear so a mounted listener stays in sync.
const subscribers = new Set<() => void>();

function notifySubscribers() {
  for (const cb of subscribers) {
    cb();
  }
}

function invalidateCache() {
  cachedRaw = undefined;
  cachedParsed = null;
}

function parseRaw(raw: string | null): TwoFactorChallenge | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TwoFactorChallenge;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readSnapshot(): TwoFactorChallenge | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  cachedParsed = parseRaw(raw);
  return cachedParsed;
}

export function getTwoFactorChallengeSnapshot() {
  return readSnapshot();
}

export function getTwoFactorChallengeServerSnapshot(): TwoFactorChallenge | null {
  return null;
}

export function subscribeTwoFactorChallenge(callback: () => void) {
  subscribers.add(callback);
  if (typeof window === "undefined") {
    return () => {
      subscribers.delete(callback);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) {
      invalidateCache();
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveTwoFactorChallenge(challenge: TwoFactorChallenge) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(challenge));
  invalidateCache();
  notifySubscribers();
}

export function readTwoFactorChallenge(): TwoFactorChallenge | null {
  return readSnapshot();
}

export function clearTwoFactorChallenge() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  invalidateCache();
  notifySubscribers();
}
