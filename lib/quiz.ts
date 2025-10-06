import { Observation, QuizQuestion } from "@/types/inaturalist";

/**
 * Normalize common name capitalization to title case
 * Handles hyphenated words properly (e.g., "jack-o'-lantern" -> "Jack-O'-Lantern")
 */
function normalizeCommonName(name: string): string {
  return name
    .split(' ')
    .map(word => {
      // Handle hyphenated words by capitalizing each part
      return word
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('-');
    })
    .join(' ');
}

/**
 * Generate a quiz question from observations
 * Picks one correct answer and 3 wrong answers from the observations
 */
export function generateQuizQuestion(
  observations: Observation[],
  correctIndex: number
): QuizQuestion | null {
  if (observations.length < 4) {
    return null;
  }

  const correctObservation = observations[correctIndex];

  if (!correctObservation.photos || correctObservation.photos.length === 0) {
    return null;
  }

  // Get 3 other unique species for wrong answers
  const seenTaxonIds = new Set<number>([correctObservation.taxon.id]);
  const wrongAnswers: Array<{
    scientificName: string;
    commonName: string;
    taxonId: number;
  }> = [];

  for (const obs of observations) {
    if (wrongAnswers.length >= 3) break;
    if (!seenTaxonIds.has(obs.taxon.id)) {
      seenTaxonIds.add(obs.taxon.id);
      wrongAnswers.push({
        scientificName: obs.taxon.name,
        commonName: normalizeCommonName(obs.taxon.preferred_common_name || obs.taxon.name),
        taxonId: obs.taxon.id,
      });
    }
  }

  if (wrongAnswers.length < 3) {
    return null;
  }

  const correctAnswer = {
    scientificName: correctObservation.taxon.name,
    commonName: normalizeCommonName(correctObservation.taxon.preferred_common_name || correctObservation.taxon.name),
    taxonId: correctObservation.taxon.id,
  };

  // Shuffle the options
  const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

  // Extract location if available
  const location = correctObservation.geojson?.coordinates
    ? {
        lng: correctObservation.geojson.coordinates[0],
        lat: correctObservation.geojson.coordinates[1],
        place: correctObservation.place_guess || "Unknown location",
      }
    : undefined;

  return {
    id: Date.now(),
    photoUrl: correctObservation.photos[0].url.replace("square", "large"),
    photoAttribution: correctObservation.photos[0].attribution,
    photos: correctObservation.photos.map(photo => ({
      ...photo,
      url: photo.url.replace("square", "large"),
    })),
    correctAnswer,
    options,
    observationId: correctObservation.id,
    location,
  };
}

/**
 * Generate multiple quiz questions from a set of observations
 */
export function generateQuizQuestions(
  observations: Observation[],
  count: number = 10
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const usedIndices = new Set<number>();

  let attempts = 0;
  const maxAttempts = observations.length * 2;

  while (questions.length < count && attempts < maxAttempts) {
    const randomIndex = Math.floor(Math.random() * observations.length);

    if (!usedIndices.has(randomIndex)) {
      const question = generateQuizQuestion(observations, randomIndex);
      if (question) {
        questions.push(question);
        usedIndices.add(randomIndex);
      }
    }

    attempts++;
  }

  return questions;
}
