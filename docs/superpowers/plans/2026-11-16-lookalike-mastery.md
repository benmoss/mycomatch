# Look-alike Quiz Engine with Per-Species Mastery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace random distractors with a per-species difficulty ramp (different family → same family → real look-alikes), driven by progress stored in localStorage.

**Architecture:** Three new API routes serve a cached regional species pool, cached look-alikes per species, and uncached bulk photos. Everything else is pure TypeScript in `lib/`: ramp rules, distractor picking, species selection, and a `buildQuiz` orchestrator with injected fetchers. That keeps it unit-testable without a browser. The quiz page calls `buildQuiz` and records answers into progress.

**Tech Stack:** Next.js 15 (App Router, route handlers), React 19, TypeScript, Tailwind 4, Vitest (new), iNaturalist API v1. Hosted on AWS Amplify.

**Spec:** `docs/superpowers/specs/2026-11-16-lookalike-mastery-design.md`

## Global Constraints

- All photo fetches keep `photo_license=cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa,cc0`, `quality_grade=research`, `photos=true`.
- Answers and distractors are always `rank === "species"`. Varieties and subspecies roll up to their species.
- Pool: top ~200 species by research-grade observation count for region + optional phylum. Pool and look-alikes are cached ~24h (`86400`s). Photos are never cached.
- iNat budget: one photo request per quiz. Never one request per species per quiz.
- Progress key: `mycomatch.progress.v1`. Quiz session key: `mycomatch.quizState.v2`. The legacy `quizState` key is discarded.
- Ramp: promote after **2** consecutive correct at current tier. A miss demotes one tier (min 0) and resets the streak. Tier 3 = mastered and is quizzed with hard distractors.
- Quiz mix (10 questions): ~60% in progress (least recently seen first), ~30% new (pool order), ~10% mastered. Shortfalls are filled from the other buckets.
- Worldwide gets the full ramp, same as any region.
- Tier label copy: tier 0 `New species`, tier 1 `Same family`, tier 2 `Look-alikes`. It shows the tier actually used.
- Summary copy: header `{mastered} mastered · {learning} learning`. End screen `{mastered} mastered · {learning} learning · {seen} seen`.
- All localStorage access is wrapped in try/catch. If storage is unavailable, the app works with empty progress.

## Review Focus

1. **A selected species gets no photo back** (rare species crowded out of the single random photo response). The quiz should still produce questions from the species that do have photos. It should never crash or show a photo-less question. Covered in Task 7.
2. **Pool too small for 3 distractors** (narrow phylum filter + region, e.g. Chytridiomycota in Australia). That question should be skipped. If no questions can be built, the user sees a clear message, not a 2-option question. Covered in Tasks 4 and 7.
3. **Look-alikes request fails or iNat is slow for one species.** That question falls back to the genus/family rules and the quiz still loads. Covered in Task 7.
4. **localStorage corrupt, from an older shape, or throwing** (private mode). Progress loads as empty and the quiz works. Covered in Task 2.
5. **Reload after answering.** The answered question stays answered and can't be re-submitted to double-count toward promotion. Covered in Task 8 (session helpers) and Task 9.

---

### Task 1: Server cache helper and Amplify verification

**Files:**
- Create: `lib/serverCache.ts`
- Create: `app/api/cache-check/route.ts` (throwaway, removed in Task 10)

**Interfaces:**
- Produces: `cached<T>(keyParts: string[], ttlSeconds: number, fn: () => Promise<T>): Promise<T>` in `lib/serverCache.ts`. Every later route caches through this, and only this.

- [ ] **Step 1: Implement `cached`** with `unstable_cache` from `next/cache` (`unstable_cache(fn, keyParts, { revalidate: ttlSeconds })()`). Add one comment noting that this is the single swap point for an in-memory TTL map if Amplify's data cache doesn't persist.
- [ ] **Step 2: Add `GET /api/cache-check`.** It returns `{ cachedAt: number, now: number }`, where `cachedAt` comes from `cached(["cache-check"], 300, async () => Date.now())`. Mark the route `export const dynamic = "force-dynamic"` so only the inner value is cached.
- [ ] **Step 3: Verify locally.** Run `npm run build && npm start`, then `curl localhost:3000/api/cache-check` twice, 10s apart. Expected: the same `cachedAt` both times, and a different `now`.
- [ ] **Step 4: Commit and push the branch** (`git push -u origin feat/lookalike-mastery`). Commit message: `feat(api): add server cache helper with cache-check route`.
- [ ] **Step 5: Verify on Amplify.** Find the branch URL in the Amplify console. If the branch isn't deployed, **stop and ask the user** to connect `feat/lookalike-mastery` in the Amplify console. Hit `/api/cache-check` about 5 times over 2 minutes. Expected: the same `cachedAt` each time. If it changes, swap `cached`'s body for a module-level `Map<string, { value, expires }>` and record that in the commit message. Report the result to the user either way.

### Task 2: Vitest setup, quiz types, and progress ramp

**Files:**
- Modify: `package.json` (add `vitest` devDependency and the script `"test": "vitest run"`)
- Create: `vitest.config.ts` (alias `@` → project root, environment `node`)
- Create: `types/quiz.ts`
- Create: `lib/progress.ts`, `lib/progress.test.ts`

**Interfaces:**
- Produces (`types/quiz.ts`):
  ```ts
  export type Tier = 0 | 1 | 2 | 3;
  export interface PoolSpecies { taxonId: number; scientificName: string; commonName: string; observationCount: number; genusId: number; familyId: number; orderId: number; }
  export interface Lookalike { taxonId: number; scientificName: string; commonName: string; confusionCount: number; }
  export interface AnswerOption { scientificName: string; commonName: string; taxonId: number; }
  export interface SpeciesProgress { taxonId: number; tier: Tier; streak: number; seen: number; correct: number; lastSeen: string; confusions: Record<number, number>; }
  export type ProgressStore = Record<number, SpeciesProgress>;
  ```
- Produces (`lib/progress.ts`):
  - `getTier(store: ProgressStore, taxonId: number): Tier`. Returns 0 if unseen.
  - `recordAnswer(store: ProgressStore, taxonId: number, pickedTaxonId: number, now: Date): ProgressStore`. Pure, returns a new store.
  - `summarize(store: ProgressStore): { mastered: number; learning: number; seen: number }`. Learning = tiers 0–2. Seen = all entries.
  - `loadProgress(storage?: Storage): ProgressStore`, `saveProgress(store: ProgressStore, storage?: Storage): void`, `resetProgress(storage?: Storage): void`. The default is `window.localStorage`. Tests pass a Map-backed fake.

- [ ] **Step 1: Install and configure.** Run `npm i -D vitest` and add the config and script.
- [ ] **Step 2: Write the failing tests** in `lib/progress.test.ts`:
  - `unseen species is tier 0`: `getTier({}, 1) === 0`.
  - `two correct in a row promotes`: two `recordAnswer(s, 1, 1, now)` calls give tier 1 and streak 0. One call gives tier 0 and streak 1.
  - `tier caps at 3`: starting from tier 3 with streak 1, a correct answer leaves tier 3.
  - `miss demotes and records confusion`: from tier 2, `recordAnswer(s, 1, 99, now)` gives tier 1, streak 0, and `confusions[99] === 1`. A second miss gives tier 0. A third miss stays at 0.
  - `seen/correct/lastSeen update`: after one correct and one miss, `seen === 2`, `correct === 1`, and `lastSeen === now.toISOString()`.
  - `summarize`: a store with tiers [0, 1, 2, 3, 3] gives `{ mastered: 2, learning: 3, seen: 5 }`.
  - `loadProgress tolerates garbage`: a fake storage holding `"{not json"` gives `{}`. A fake whose `getItem` throws gives `{}`.
  - `save/load round-trip` under the key `mycomatch.progress.v1`. `resetProgress` removes the key.
- [ ] **Step 3: Run `npx vitest run lib/progress.test.ts`.** Expected: FAIL (module not found).
- [ ] **Step 4: Implement `lib/progress.ts`** following the ramp rules in Global Constraints.
- [ ] **Step 5: Run `npx vitest run lib/progress.test.ts`.** Expected: all pass.
- [ ] **Step 6: Commit** with `feat(quiz): add per-species progress ramp with vitest`.

### Task 3: Distractor selection

**Files:**
- Create: `lib/distractors.ts`, `lib/distractors.test.ts`
- Modify: `lib/quiz.ts`. Export `normalizeCommonName` (it currently isn't exported).

**Interfaces:**
- Consumes: `PoolSpecies`, `Lookalike`, `AnswerOption`, `Tier` from Task 2.
- Produces: `pickDistractors(answer: PoolSpecies, tier: Tier, pool: PoolSpecies[], lookalikes: Lookalike[], rng: () => number): { distractors: AnswerOption[]; usedTier: 0 | 1 | 2 }`. Returns **up to** 3 distractors. Fewer than 3 means the pool can't support a question.

Rules (from spec):
- Tier 0: random pool species with `familyId !== answer.familyId`.
- Tier 1: same `familyId` first, then same `orderId`, then fill with tier 0 rules.
- Tier 2–3: look-alikes sorted by `confusionCount` desc. In-pool look-alikes come first, then non-local ones (no marking). Only if `lookalikes.length < 3`, fill from same `genusId`, then tier 1 rules.
- `usedTier`: 2 if any distractor came from look-alikes. Otherwise 1 if any came from same family or order. Otherwise 0.
- Never include the answer. Never repeat a taxon.

- [ ] **Step 1: Write the failing tests.** Use a fixture pool of ~12 species across 3 families, 2 orders, and a few shared genera, and a seeded `rng`.
  - `tier 0 picks only other families`.
  - `tier 1 prefers same family, then same order, then fills`. With only 1 same-family species, the result has that one + order-mates, and `usedTier === 1`.
  - `tier 2 prefers in-pool look-alikes over non-local`. With look-alikes [A(non-local, 900), B(in pool, 500), C(in pool, 400), D(non-local, 300)], the result is [B, C, A] and `usedTier === 2`.
  - `tier 2 fills with non-local look-alikes before genus`. With 1 in-pool + 3 non-local look-alikes, all 3 distractors are look-alikes.
  - `tier 2 with <3 look-alikes fills from genus then family`. With 1 look-alike, 1 genus-mate, and family-mates, the result is [look-alike, genus-mate, family-mate].
  - `tier 2 with no look-alikes falls back`, giving `usedTier === 1`.
  - `tier 3 behaves like tier 2`.
  - `never includes answer or duplicates`. Look-alikes include the answer's own taxonId and a duplicate entry. Neither appears twice or as a distractor.
  - `tiny pool returns fewer than 3`. A pool of 2 species gives `distractors.length === 1`.
- [ ] **Step 2: Run `npx vitest run lib/distractors.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement `pickDistractors`.** Common names go through `normalizeCommonName`. Fall back to the scientific name when there's no common name.
- [ ] **Step 4: Run `npx vitest run lib/distractors.test.ts`.** Expected: all pass.
- [ ] **Step 5: Commit** with `feat(quiz): pick distractors by tier with look-alike fallbacks`.

### Task 4: Species selection for a quiz

**Files:**
- Create: `lib/selection.ts`, `lib/selection.test.ts`

**Interfaces:**
- Consumes: `PoolSpecies`, `ProgressStore` (Task 2), `getTier` (Task 2).
- Produces: `selectSpecies(pool: PoolSpecies[], store: ProgressStore, count: number, rng: () => number): PoolSpecies[]`. It returns at most `count` distinct species, all from `pool`, in random order. `pool` is assumed sorted by `observationCount` desc.

Bucket targets: `inProgress = round(count * 0.6)`, `newer = round(count * 0.3)`, `mastered = count - inProgress - newer`. In-progress means seen with tier < 3, sorted by `lastSeen` asc. New means unseen, in pool order. Mastered means tier 3, random. Fill shortfalls in the order inProgress → new → mastered.

- [ ] **Step 1: Write the failing tests:**
  - `first-time user gets the most common species`. An empty store and a 50-species pool give exactly `pool.slice(0, 10)` as a set.
  - `mix respects targets`. With 20 in-progress, 20 new, and 20 mastered, count 10 gives 6 / 3 / 1.
  - `in-progress picks least recently seen first`.
  - `shortfall is filled`. With 0 mastered and 2 in-progress, the result is still 10 species.
  - `only pool species, no duplicates`. Progress for taxa not in the pool is ignored.
  - `pool smaller than count returns whole pool`.
- [ ] **Step 2: Run `npx vitest run lib/selection.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement `selectSpecies`.**
- [ ] **Step 4: Run `npx vitest run lib/selection.test.ts`.** Expected: all pass.
- [ ] **Step 5: Commit** with `feat(quiz): select quiz species by mastery buckets`.

### Task 5: Species pool route

**Files:**
- Create: `lib/pool.ts`, `lib/pool.test.ts`
- Create: `app/api/pool/route.ts`
- Modify: `types/filters.ts`. Remove `difficulty` from `QuizFilters`, and add `getRegionBounds(regionId?: string): RegionBounds | undefined`.

**Interfaces:**
- Consumes: `cached` (Task 1), `PoolSpecies` (Task 2), `normalizeCommonName` (Task 3).
- Produces:
  - `assemblePool(counts: SpeciesCountResult[], taxa: TaxonRecord[]): PoolSpecies[]` in `lib/pool.ts`. A pure transform. `SpeciesCountResult` and `TaxonRecord` are minimal local types matching iNat's `species_counts` results (`{ count, taxon: { id, rank, ancestor_ids } }`) and the `/v1/taxa/{ids}` results (`{ id, name, rank, preferred_common_name?, ancestors: { id, rank }[] }`).
  - `fetchPool(regionId: string | undefined, taxonId: number | undefined): Promise<PoolSpecies[]>` in `lib/pool.ts`.
  - `GET /api/pool?region=<id>&taxonId=<n>` returns `{ species: PoolSpecies[] }`.

Approach for `fetchPool`: call `/v1/observations/species_counts` with `quality_grade=research`, `photos=true`, the license list, `per_page=200`, region bounds, and either `iconic_taxa=Fungi` or `taxon_id`. Roll infraspecific taxa up to their parent, which is `ancestor_ids` second-to-last, since `ancestor_ids` ends with the taxon itself. Then resolve all ids via `/v1/taxa/{comma-ids}` in batches of 30, reading `ancestors[].rank` for genus, family, and order (confirmed working). Wrap the whole thing in `cached(["pool", regionId ?? "all", String(taxonId ?? "all")], 86400, …)`.

- [ ] **Step 1: Write the failing tests** for `assemblePool`:
  - `rolls varieties up and merges counts`. `Amanita muscaria var. guessowii` (rank `variety`, count 30) + `Amanita muscaria` (count 100) give one entry with count 130.
  - `drops non-species ranks`. A genus-rank count entry is excluded.
  - `drops species missing family or order`, so the distractor rules can rely on them.
  - `sorted by observationCount desc`.
  - `normalizes common names` and falls back to the scientific name when there's no common name.
- [ ] **Step 2: Run `npx vitest run lib/pool.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement `assemblePool`, `fetchPool`, and the route.** The route returns 500 with `{ error }` on failure, like the existing routes.
- [ ] **Step 4: Run `npx vitest run lib/pool.test.ts`.** Expected: all pass.
- [ ] **Step 5: Smoke test.** With `npm run dev`, run `curl 'localhost:3000/api/pool?region=na-west' | head -c 600`. Expected: ~200 species, with *Amanita muscaria* near the top and every entry having `familyId`.
- [ ] **Step 6: Commit** with `feat(api): add cached regional species pool`.

### Task 6: Look-alikes and photos routes

**Files:**
- Create: `app/api/lookalikes/route.ts`, `lib/lookalikes.ts`, `lib/lookalikes.test.ts`
- Create: `app/api/photos/route.ts`
- Modify: `lib/inaturalist.ts`. Add `orderBy` (mapped to `order_by`) to `FetchObservationsParams`, and accept `taxonId: number | string` for comma lists.
- Modify: `types/inaturalist.ts`. Add `ancestor_ids?: number[]` to `Taxon`.

**Interfaces:**
- Consumes: `cached` (Task 1), `Lookalike` (Task 2), `getRegionBounds` (Task 5).
- Produces:
  - `parseLookalikes(results: SimilarSpeciesResult[]): Lookalike[]`. Pure. Keeps `rank === "species"` and sorts by `count` desc.
  - `GET /api/lookalikes?taxonId=<n>` returns `{ lookalikes: Lookalike[] }`, cached with `["lookalikes", id]` and `86400`.
  - `GET /api/photos?taxonIds=a,b,c&region=<id>` returns `{ observations: Record<number, Observation> }`, keyed by the *requested* taxonId, with at most one per species. Uses `fetchMushroomObservations` with `taxonId: ids.join(",")`, `perPage: 200`, `orderBy: "random"` (confirmed working), and the region bounds. An observation of a variety maps to the requested species via `taxon.id` or `taxon.ancestor_ids`. Not cached.

- [ ] **Step 1: Write the failing tests** for `parseLookalikes`: it filters genus-rank entries, sorts by count, and normalizes common names.
- [ ] **Step 2: Run `npx vitest run lib/lookalikes.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement `parseLookalikes` and both routes.**
- [ ] **Step 4: Run `npx vitest run lib/lookalikes.test.ts`.** Expected: all pass.
- [ ] **Step 5: Smoke test.** `curl 'localhost:3000/api/lookalikes?taxonId=48715'` should list *Amanita flavoconia* first. `curl 'localhost:3000/api/photos?taxonIds=48715,54134&region=na-west'` should return keys `48715` and `54134`.
- [ ] **Step 6: Commit** with `feat(api): add look-alikes and bulk photo routes`.

### Task 7: Quiz builder

**Files:**
- Modify: `types/inaturalist.ts`. Add `speciesTier: Tier` and `usedTier: 0 | 1 | 2` to `QuizQuestion`, and type `correctAnswer`/`options` as `AnswerOption`.
- Create: `lib/buildQuiz.ts`, `lib/buildQuiz.test.ts`

**Interfaces:**
- Consumes: `selectSpecies` (Task 4), `pickDistractors` (Task 3), `getTier` (Task 2), and the route shapes from Tasks 5–6.
- Produces:
  ```ts
  export interface QuizDeps {
    fetchPool(filters: QuizFilters): Promise<PoolSpecies[]>;
    fetchLookalikes(taxonId: number): Promise<Lookalike[]>;
    fetchPhotos(taxonIds: number[], filters: QuizFilters): Promise<Record<number, Observation>>;
    rng: () => number;
  }
  export function buildQuiz(filters: QuizFilters, store: ProgressStore, deps: QuizDeps, count?: number): Promise<QuizQuestion[]>; // count defaults to 10
  export const httpQuizDeps: QuizDeps; // calls /api/pool, /api/lookalikes, /api/photos; rng = Math.random
  ```

Flow: pool → `selectSpecies(pool, store, count + 5, rng)` → `fetchLookalikes` in parallel for species with tier ≥ 2 (a rejection becomes `[]`) → one `fetchPhotos` call for all selected → for each species with a photo, `pickDistractors`, skipping any with < 3 distractors → take the first `count` → shuffle the options within each question. The question's photo fields are built the way the old `generateQuizQuestion` built them (`square` → `large`, the `location` from `geojson`). If zero questions result, throw `Error("Not enough species with photos for these filters. Try a wider region or mushroom type.")`.

- [ ] **Step 1: Write the failing tests** with fake deps:
  - `builds count questions with 4 options each, answer included`.
  - `skips species with no photo` (Review Focus 1). With 15 selected and only 8 having photos, the result is 8 questions and none lacks photos.
  - `skips questions without enough distractors` (Review Focus 2). A 3-species pool throws the "Not enough species" error.
  - `look-alike failure falls back` (Review Focus 3). For a tier-2 species where `fetchLookalikes` rejects, the question still builds with `usedTier < 2`.
  - `only fetches look-alikes for tier ≥ 2 species`.
  - `fetchPhotos is called exactly once`.
  - `records speciesTier from the store`.
- [ ] **Step 2: Run `npx vitest run lib/buildQuiz.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement `buildQuiz` and `httpQuizDeps`.**
- [ ] **Step 4: Run `npm test`.** Expected: all suites pass.
- [ ] **Step 5: Commit** with `feat(quiz): build quizzes from pool, progress and look-alikes`.

### Task 8: Quiz session persistence

**Files:**
- Create: `lib/session.ts`, `lib/session.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface QuizSession { questions: QuizQuestion[]; currentQuestionIndex: number; score: number; filters: QuizFilters; answers: Record<number, number>; promoted: number[]; } // answers: question index -> option index; promoted: taxonIds promoted this quiz
  export function loadSession(storage?: Storage): QuizSession | null;
  export function saveSession(session: QuizSession, storage?: Storage): void;
  export function clearSession(storage?: Storage): void;
  ```
  Uses the key `mycomatch.quizState.v2`. `loadSession` also removes the legacy `quizState` key.

- [ ] **Step 1: Write the failing tests:**
  - `round-trips answers and promoted` (Review Focus 5).
  - `removes legacy quizState and returns null when no v2 exists`.
  - `returns null on corrupt JSON or a throwing storage`.
  - `returns null when questions lack usedTier`, which guards against hand-edited or older shapes.
- [ ] **Step 2: Run `npx vitest run lib/session.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npx vitest run lib/session.test.ts`.** Expected: all pass.
- [ ] **Step 5: Commit** with `feat(quiz): versioned quiz session persistence`.

### Task 9: Quiz page integration

**Files:**
- Modify: `app/quiz/page.tsx`

**Interfaces:**
- Consumes: `buildQuiz`, `httpQuizDeps` (Task 7), `loadProgress`/`saveProgress`/`recordAnswer`/`resetProgress`/`summarize`/`getTier` (Task 2), and `loadSession`/`saveSession`/`clearSession` (Task 8).

- [ ] **Step 1: Replace loading.** `loadQuiz` calls `buildQuiz(filters, loadProgress(), httpQuizDeps)`. Replace the direct `/api/observations` fetch and the `generateQuizQuestions` call. Show error messages as-is.
- [ ] **Step 2: Replace persistence.** Swap the `localStorage.*('quizState')` calls for the session helpers. Store `answers` and `promoted` in state. On resume, if `answers[currentQuestionIndex]` exists, restore `selectedAnswer` and set `isAnswered = true`, so a re-submit isn't possible. Save the session immediately on submit.
- [ ] **Step 3: Record progress on submit.** Get `before = getTier(store, correct.taxonId)`, then run `recordAnswer(store, correct.taxonId, selected.taxonId, new Date())`, then `saveProgress`. If the new tier > `before`, append to `promoted`. Keep a `progressSummary` state from `summarize` and refresh it after each answer.
- [ ] **Step 4: UI.**
  - Header: show the summary next to the score (`🍄 {mastered} mastered · {learning} learning`). Hide it below `sm`.
  - Above the photo, show a pill with the tier label for `currentQuestion.usedTier`, using the Global Constraints copy and existing theme tokens (`bg-sand/50`, `text-forest`, `border-moss/20`).
  - End screen ("Quiz Complete! 🎉" block): show the full summary line, plus "Moved up: {common names}" when `promoted` is non-empty.
  - Filters panel: add a "Reset progress" text button. It calls `window.confirm("Reset all progress? This can't be undone.")`, then `resetProgress()` and refreshes the summary.
- [ ] **Step 5: Verify.** `npm run lint && npm run build` should both succeed. Then run `npm run dev`:
  - Start a quiz in Western North America. All 10 questions should show the "New species" label, and the options should come from different families.
  - Answer one correctly, reload, and confirm it's still answered.
  - In DevTools, set one taxon's progress to tier 2 in `mycomatch.progress.v1`, start a new quiz until it appears, and confirm the label says "Look-alikes" with real look-alikes as options.
  - Click "Reset progress" and confirm the summary shows 0.
- [ ] **Step 6: Commit** with `feat(quiz): wire mastery ramp, tier labels and progress summary into quiz`.

### Task 10: Cleanup

**Files:**
- Delete: `app/api/cache-check/route.ts`
- Modify: `lib/quiz.ts`. Remove `generateQuizQuestion(s)`, which has no callers after Task 9. Keep `normalizeCommonName`.

- [ ] **Step 1: Delete the cache-check route and the old generators.** Run `grep -rn "difficulty\|generateQuizQuestion\|'quizState'" app lib types`. Expected: no matches.
- [ ] **Step 2: Run `npm test && npm run lint && npm run build`.** Expected: all succeed.
- [ ] **Step 3: Commit** with `chore: remove cache-check spike route`.
