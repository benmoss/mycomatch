import { describe, expect, it } from "vitest";
import {
  getTier,
  loadProgress,
  recordAnswer,
  resetProgress,
  saveProgress,
  summarize,
} from "@/lib/progress";
import { ProgressStore, SpeciesProgress, Tier } from "@/types/quiz";

const now = new Date("2026-11-16T12:00:00Z");

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

function entry(taxonId: number, tier: Tier, streak = 0): SpeciesProgress {
  return { taxonId, tier, streak, seen: 1, correct: 1, lastSeen: now.toISOString(), confusions: {} };
}

describe("getTier", () => {
  it("unseen species is tier 0", () => {
    expect(getTier({}, 1)).toBe(0);
  });
});

describe("recordAnswer", () => {
  it("one correct answer builds a streak without promoting", () => {
    const s = recordAnswer({}, 1, 1, now);
    expect(s[1].tier).toBe(0);
    expect(s[1].streak).toBe(1);
  });

  it("two correct in a row promotes", () => {
    const s = recordAnswer(recordAnswer({}, 1, 1, now), 1, 1, now);
    expect(s[1].tier).toBe(1);
    expect(s[1].streak).toBe(0);
  });

  it("tier caps at 3", () => {
    const s = recordAnswer({ 1: entry(1, 3, 1) }, 1, 1, now);
    expect(s[1].tier).toBe(3);
  });

  it("miss demotes and records confusion", () => {
    let s: ProgressStore = recordAnswer({ 1: entry(1, 2, 1) }, 1, 99, now);
    expect(s[1].tier).toBe(1);
    expect(s[1].streak).toBe(0);
    expect(s[1].confusions[99]).toBe(1);
    s = recordAnswer(s, 1, 99, now);
    expect(s[1].tier).toBe(0);
    expect(s[1].confusions[99]).toBe(2);
    s = recordAnswer(s, 1, 99, now);
    expect(s[1].tier).toBe(0);
  });

  it("seen/correct/lastSeen update", () => {
    const s = recordAnswer(recordAnswer({}, 1, 1, now), 1, 2, now);
    expect(s[1].seen).toBe(2);
    expect(s[1].correct).toBe(1);
    expect(s[1].lastSeen).toBe(now.toISOString());
  });

  it("does not mutate the input store", () => {
    const before: ProgressStore = { 1: entry(1, 1, 1) };
    recordAnswer(before, 1, 1, now);
    expect(before[1].tier).toBe(1);
    expect(before[1].streak).toBe(1);
  });
});

describe("summarize", () => {
  it("counts mastered, learning and seen", () => {
    const store: ProgressStore = {
      1: entry(1, 0),
      2: entry(2, 1),
      3: entry(3, 2),
      4: entry(4, 3),
      5: entry(5, 3),
    };
    expect(summarize(store)).toEqual({ mastered: 2, learning: 3, seen: 5 });
  });
});

describe("storage", () => {
  it("loadProgress tolerates corrupt JSON", () => {
    expect(loadProgress(fakeStorage({ "mycomatch.progress.v1": "{not json" }))).toEqual({});
  });

  it("loadProgress tolerates a throwing storage", () => {
    const storage = fakeStorage();
    storage.getItem = () => {
      throw new Error("denied");
    };
    expect(loadProgress(storage)).toEqual({});
  });

  it("save/load round-trip and reset", () => {
    const storage = fakeStorage();
    const store: ProgressStore = { 7: entry(7, 2) };
    saveProgress(store, storage);
    expect(storage.getItem("mycomatch.progress.v1")).not.toBeNull();
    expect(loadProgress(storage)).toEqual(store);
    resetProgress(storage);
    expect(storage.getItem("mycomatch.progress.v1")).toBeNull();
  });
});
