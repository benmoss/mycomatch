import { describe, expect, it } from "vitest";
import { selectSpecies } from "@/lib/selection";
import { PoolSpecies, ProgressStore, SpeciesProgress, Tier } from "@/types/quiz";
import { seeded } from "@/test/helpers";

function sp(taxonId: number): PoolSpecies {
  return {
    taxonId,
    scientificName: `Species ${taxonId}`,
    commonName: `Common ${taxonId}`,
    observationCount: 10000 - taxonId,
    genusId: taxonId,
    familyId: taxonId,
    orderId: 1,
  };
}

function progress(taxonId: number, tier: Tier, lastSeen = "2026-11-01T00:00:00Z"): SpeciesProgress {
  return { taxonId, tier, streak: 0, seen: 1, correct: 0, lastSeen, confusions: {} };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const pool = range(1, 60).map(sp);
const ids = (species: PoolSpecies[]) => species.map((s) => s.taxonId);

describe("selectSpecies", () => {
  it("first-time user gets the most common species", () => {
    const result = selectSpecies(pool, {}, 10, seeded());
    expect(ids(result).sort((a, b) => a - b)).toEqual(range(1, 10));
  });

  it("mix respects targets", () => {
    const store: ProgressStore = {};
    for (const id of range(1, 20)) store[id] = progress(id, 1);
    for (const id of range(41, 60)) store[id] = progress(id, 3);
    const result = ids(selectSpecies(pool, store, 10, seeded()));
    expect(result.filter((id) => id <= 20)).toHaveLength(6);
    expect(result.filter((id) => id > 20 && id <= 40).sort((a, b) => a - b)).toEqual([21, 22, 23]);
    expect(result.filter((id) => id > 40)).toHaveLength(1);
  });

  it("in-progress picks least recently seen first", () => {
    const store: ProgressStore = {};
    // Higher ids were seen longer ago
    for (const id of range(1, 20)) {
      store[id] = progress(id, 1, new Date(Date.UTC(2026, 0, 30 - id)).toISOString());
    }
    for (const id of range(41, 60)) store[id] = progress(id, 3);
    const result = ids(selectSpecies(pool, store, 10, seeded()));
    expect(result.filter((id) => id <= 20).sort((a, b) => a - b)).toEqual(range(15, 20));
  });

  it("fills shortfalls from other buckets", () => {
    const store: ProgressStore = { 1: progress(1, 0), 2: progress(2, 2) };
    const result = ids(selectSpecies(pool, store, 10, seeded()));
    expect(result).toHaveLength(10);
    expect(result).toContain(1);
    expect(result).toContain(2);
  });

  it("only returns pool species, without duplicates", () => {
    const store: ProgressStore = { 999: progress(999, 1), 998: progress(998, 3) };
    const result = ids(selectSpecies(pool, store, 10, seeded()));
    expect(result).not.toContain(999);
    expect(result).not.toContain(998);
    expect(new Set(result).size).toBe(10);
  });

  it("returns the whole pool when it is smaller than count", () => {
    const result = selectSpecies(pool.slice(0, 5), {}, 10, seeded());
    expect(ids(result).sort((a, b) => a - b)).toEqual(range(1, 5));
  });
});
