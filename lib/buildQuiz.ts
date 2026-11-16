import { pickDistractors } from "@/lib/distractors";
import { getTier } from "@/lib/progress";
import { shuffled } from "@/lib/random";
import { selectSpecies } from "@/lib/selection";
import { QuizFilters } from "@/types/filters";
import { Observation, QuizQuestion } from "@/types/inaturalist";
import { Lookalike, PoolSpecies, ProgressStore } from "@/types/quiz";

// Extra species to request so a few missing photos don't shorten the quiz
const PHOTO_HEADROOM = 5;

// A slow look-alike lookup falls back to family distractors instead of holding up the quiz
export const LOOKALIKE_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

export interface QuizDeps {
  fetchPool(filters: QuizFilters): Promise<PoolSpecies[]>;
  fetchLookalikes(taxonId: number): Promise<Lookalike[]>;
  fetchPhotos(taxonIds: number[], filters: QuizFilters): Promise<Record<number, Observation>>;
  rng: () => number;
}

function toQuestion(
  observation: Observation,
  answer: PoolSpecies,
  options: QuizQuestion["options"],
  speciesTier: QuizQuestion["speciesTier"],
  usedTier: QuizQuestion["usedTier"]
): QuizQuestion {
  const photos = observation.photos.map((photo) => ({
    ...photo,
    url: photo.url.replace("square", "large"),
  }));

  const location = observation.geojson?.coordinates
    ? {
        lng: observation.geojson.coordinates[0],
        lat: observation.geojson.coordinates[1],
        place: observation.place_guess || "Unknown location",
      }
    : undefined;

  return {
    id: observation.id,
    photoUrl: photos[0].url,
    photoAttribution: photos[0].attribution,
    photos,
    correctAnswer: {
      taxonId: answer.taxonId,
      scientificName: answer.scientificName,
      commonName: answer.commonName,
    },
    options,
    observationId: observation.id,
    location,
    speciesTier,
    usedTier,
  };
}

/**
 * Build a quiz: pick species by mastery, choose distractors for each
 * species' tier, and attach one photo per species (fetched in one call).
 */
export async function buildQuiz(
  filters: QuizFilters,
  store: ProgressStore,
  deps: QuizDeps,
  count = 10
): Promise<QuizQuestion[]> {
  const pool = await deps.fetchPool(filters);
  const selected = selectSpecies(pool, store, count + PHOTO_HEADROOM, deps.rng);

  const hard = selected.filter((s) => getTier(store, s.taxonId) >= 2);
  const [lookalikeLists, photos] = await Promise.all([
    Promise.all(
      hard.map((s) => withTimeout(deps.fetchLookalikes(s.taxonId), LOOKALIKE_TIMEOUT_MS, [] as Lookalike[]))
    ),
    deps.fetchPhotos(
      selected.map((s) => s.taxonId),
      filters
    ),
  ]);
  const lookalikesById = new Map(hard.map((s, i) => [s.taxonId, lookalikeLists[i]]));

  const questions: QuizQuestion[] = [];
  for (const species of selected) {
    if (questions.length >= count) break;
    const observation = photos[species.taxonId];
    if (!observation?.photos?.length) continue;

    const speciesTier = getTier(store, species.taxonId);
    const { distractors, usedTier } = pickDistractors(
      species,
      speciesTier,
      pool,
      lookalikesById.get(species.taxonId) ?? [],
      deps.rng
    );
    if (distractors.length < 3) continue;

    const answerOption = {
      taxonId: species.taxonId,
      scientificName: species.scientificName,
      commonName: species.commonName,
    };
    const options = shuffled([answerOption, ...distractors], deps.rng);
    questions.push(toQuestion(observation, species, options, speciesTier, usedTier));
  }

  if (questions.length === 0) {
    throw new Error("Not enough species with photos for these filters. Try a wider region or mushroom type.");
  }

  return questions;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load quiz data");
  }
  return response.json();
}

function filterParams(filters: QuizFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.taxonId) params.set("taxonId", String(filters.taxonId));
  return params;
}

export const httpQuizDeps: QuizDeps = {
  fetchPool: async (filters) =>
    (await getJson<{ species: PoolSpecies[] }>(`/api/pool?${filterParams(filters)}`)).species,
  fetchLookalikes: async (taxonId) =>
    (await getJson<{ lookalikes: Lookalike[] }>(`/api/lookalikes?taxonId=${taxonId}`)).lookalikes,
  fetchPhotos: async (taxonIds, filters) => {
    const params = filterParams(filters);
    params.set("taxonIds", taxonIds.join(","));
    return (await getJson<{ observations: Record<number, Observation> }>(`/api/photos?${params}`)).observations;
  },
  rng: Math.random,
};
