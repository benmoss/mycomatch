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

export function loadProgress(storage?: Storage): ProgressStore {
  try {
    const raw = (storage ?? defaultStorage())?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // Keep only well-formed entries so a bad one can't break quiz building
    const store: ProgressStore = {};
    for (const [key, value] of Object.entries(parsed)) {
      const p = value as SpeciesProgress;
      if (p && typeof p.tier === "number" && typeof p.lastSeen === "string" && typeof p.taxonId === "number") {
        store[Number(key)] = { ...p, confusions: p.confusions ?? {} };
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function saveProgress(
  store: ProgressStore,
  storage?: Storage
): void {
  try {
    (storage ?? defaultStorage())?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable (private mode, quota): progress just won't persist
  }
}

export function resetProgress(storage?: Storage): void {
  try {
    (storage ?? defaultStorage())?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to reset if storage is unavailable
  }
}
