import { ProgressStore, SpeciesProgress, Tier } from "@/types/quiz";

const STORAGE_KEY = "mycomatch.progress.v1";

// Consecutive correct answers needed to move up a tier
const STREAK_TO_PROMOTE = 2;

export function getTier(store: ProgressStore, taxonId: number): Tier {
  return store[taxonId]?.tier ?? 0;
}

/**
 * Record an answer for a species and return the updated store.
 * Two correct in a row promotes one tier; a miss demotes one tier.
 */
export function recordAnswer(
  store: ProgressStore,
  taxonId: number,
  pickedTaxonId: number,
  now: Date
): ProgressStore {
  const prev: SpeciesProgress = store[taxonId] ?? {
    taxonId,
    tier: 0,
    streak: 0,
    seen: 0,
    correct: 0,
    lastSeen: now.toISOString(),
    confusions: {},
  };

  const next: SpeciesProgress = {
    ...prev,
    seen: prev.seen + 1,
    lastSeen: now.toISOString(),
    confusions: { ...prev.confusions },
  };

  if (pickedTaxonId === taxonId) {
    next.correct = prev.correct + 1;
    next.streak = prev.streak + 1;
    if (next.streak >= STREAK_TO_PROMOTE) {
      next.tier = Math.min(3, prev.tier + 1) as Tier;
      next.streak = 0;
    }
  } else {
    next.tier = Math.max(0, prev.tier - 1) as Tier;
    next.streak = 0;
    next.confusions[pickedTaxonId] = (prev.confusions[pickedTaxonId] ?? 0) + 1;
  }

  return { ...store, [taxonId]: next };
}

export function summarize(store: ProgressStore): {
  mastered: number;
  learning: number;
  seen: number;
} {
  const entries = Object.values(store);
  const mastered = entries.filter((p) => p.tier === 3).length;
  return { mastered, learning: entries.length - mastered, seen: entries.length };
}

function defaultStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function loadProgress(storage: Storage | undefined = defaultStorage()): ProgressStore {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProgress(
  store: ProgressStore,
  storage: Storage | undefined = defaultStorage()
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable (private mode, quota): progress just won't persist
  }
}

export function resetProgress(storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to reset if storage is unavailable
  }
}
