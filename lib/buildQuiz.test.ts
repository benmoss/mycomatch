import { describe, expect, it, vi } from "vitest";
import { buildQuiz, LOOKALIKE_TIMEOUT_MS, QuizDeps } from "@/lib/buildQuiz";
import { Observation } from "@/types/inaturalist";
import { Lookalike, PoolSpecies, ProgressStore, SpeciesProgress, Tier } from "@/types/quiz";
import { seeded } from "@/test/helpers";

// Four families across two orders, so every tier has candidates
function sp(taxonId: number): PoolSpecies {
  return {
    taxonId,
    scientificName: `Species ${taxonId}`,
    commonName: `Common ${taxonId}`,
    observationCount: 10000 - taxonId,
    genusId: taxonId,
    familyId: 100 + (taxonId % 4),
    orderId: 200 + (taxonId % 2),
  };
}

function obs(taxonId: number): Observation {
  return {
    id: taxonId * 10,
    taxon: { id: taxonId, name: `Species ${taxonId}`, rank: "species", iconic_taxon_name: "Fungi", observations_count: 1 },
    photos: [{ id: 1, url: "https://static.inaturalist.org/photos/1/square.jpg", attribution: "(c) someone", license_code: "cc-by" }],
    quality_grade: "research",
    observed_on: "2026-10-01",
    place_guess: "Somewhere",
    geojson: { type: "Point", coordinates: [-122, 45] },
  };
}

function progress(taxonId: number, tier: Tier): SpeciesProgress {
  return { taxonId, tier, streak: 0, seen: 1, correct: 1, lastSeen: "2026-11-01T00:00:00Z", confusions: {} };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function deps(pool: PoolSpecies[], overrides: Partial<QuizDeps> = {}) {
  const calls = { lookalikes: [] as number[], photos: 0 };
  const d: QuizDeps = {
    fetchPool: async () => pool,
    fetchLookalikes: async (taxonId) => {
      calls.lookalikes.push(taxonId);
      return [] as Lookalike[];
    },
    fetchPhotos: async (taxonIds) => {
      calls.photos++;
      return Object.fromEntries(taxonIds.map((id) => [id, obs(id)]));
    },
    rng: seeded(),
    ...overrides,
  };
  return { deps: d, calls };
}

describe("buildQuiz", () => {
  it("builds count questions with 4 distinct options including the answer", async () => {
    const { deps: d } = deps(range(30).map(sp));
    const questions = await buildQuiz({}, {}, d);
    expect(questions).toHaveLength(10);
    for (const q of questions) {
      const ids = q.options.map((o) => o.taxonId);
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size).toBe(4);
      expect(ids).toContain(q.correctAnswer.taxonId);
      expect(q.photoUrl).toContain("large");
    }
  });

  it("skips species with no photo", async () => {
    const { deps: d } = deps(range(30).map(sp), {
      fetchPhotos: async (taxonIds) => Object.fromEntries(taxonIds.slice(0, 8).map((id) => [id, obs(id)])),
    });
    const questions = await buildQuiz({}, {}, d);
    expect(questions).toHaveLength(8);
    for (const q of questions) expect(q.photos.length).toBeGreaterThan(0);
  });

  it("throws a clear error when the pool can't support questions", async () => {
    const { deps: d } = deps(range(3).map(sp));
    await expect(buildQuiz({}, {}, d)).rejects.toThrow("Not enough species");
  });

  it("falls back when look-alikes fail to load", async () => {
    const store: ProgressStore = Object.fromEntries(range(10).map((id) => [id, progress(id, 2)]));
    const { deps: d } = deps(range(10).map(sp), {
      fetchLookalikes: async () => {
        throw new Error("iNat down");
      },
    });
    const questions = await buildQuiz({}, store, d);
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.usedTier).toBeLessThan(2);
      expect(q.options).toHaveLength(4);
    }
  });

  it("only fetches look-alikes for species at tier 2 or above", async () => {
    const store: ProgressStore = { 1: progress(1, 2), 2: progress(2, 3), 3: progress(3, 1) };
    const { deps: d, calls } = deps(range(10).map(sp));
    await buildQuiz({}, store, d);
    expect(calls.lookalikes.sort()).toEqual([1, 2]);
  });

  it("fetches photos exactly once", async () => {
    const { deps: d, calls } = deps(range(30).map(sp));
    await buildQuiz({}, {}, d);
    expect(calls.photos).toBe(1);
  });

  it("records each species' tier", async () => {
    const store: ProgressStore = { 1: progress(1, 1) };
    const { deps: d } = deps(range(10).map(sp));
    const questions = await buildQuiz({}, store, d);
    const q1 = questions.find((q) => q.correctAnswer.taxonId === 1)!;
    expect(q1.speciesTier).toBe(1);
    const other = questions.find((q) => q.correctAnswer.taxonId !== 1)!;
    expect(other.speciesTier).toBe(0);
  });

  it("uses look-alikes for hard questions", async () => {
    const store: ProgressStore = { 1: progress(1, 2) };
    const { deps: d } = deps(range(10).map(sp), {
      fetchLookalikes: async () => [
        { taxonId: 500, scientificName: "Species 500", commonName: "Common 500", confusionCount: 9 },
      ],
    });
    const questions = await buildQuiz({}, store, d);
    const q1 = questions.find((q) => q.correctAnswer.taxonId === 1)!;
    expect(q1.usedTier).toBe(2);
    expect(q1.options.map((o) => o.taxonId)).toContain(500);
  });

  it("doesn't wait on a hung look-alike request", async () => {
    vi.useFakeTimers();
    try {
      const store: ProgressStore = { 1: progress(1, 2) };
      const { deps: d } = deps(range(10).map(sp), {
        fetchLookalikes: () => new Promise<Lookalike[]>(() => {}),
      });
      const pending = buildQuiz({}, store, d);
      await vi.advanceTimersByTimeAsync(LOOKALIKE_TIMEOUT_MS);
      const questions = await pending;
      expect(questions.find((q) => q.correctAnswer.taxonId === 1)?.usedTier).toBeLessThan(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("requests photos without waiting for look-alikes", async () => {
    const store: ProgressStore = { 1: progress(1, 2) };
    let releaseLookalikes: (l: Lookalike[]) => void = () => {};
    const { deps: d, calls } = deps(range(10).map(sp), {
      fetchLookalikes: () => new Promise<Lookalike[]>((resolve) => (releaseLookalikes = resolve)),
    });
    const pending = buildQuiz({}, store, d);
    await new Promise((r) => setTimeout(r, 0));
    const photosBeforeLookalikes = calls.photos;
    releaseLookalikes([]);
    await pending;
    expect(photosBeforeLookalikes).toBe(1);
  });
});
