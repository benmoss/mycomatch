import { AnswerOption, Tier } from "@/types/quiz";

export interface Photo {
  id: number;
  url: string;
  attribution: string;
  license_code: string;
}

export interface Taxon {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  iconic_taxon_name: string;
  observations_count: number;
  ancestor_ids?: number[];
}

export interface Observation {
  id: number;
  taxon: Taxon;
  photos: Photo[];
  quality_grade: string;
  location?: string;
  observed_on: string;
  place_guess?: string;
  geojson?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface INaturalistResponse {
  total_results: number;
  page: number;
  per_page: number;
  results: Observation[];
}

export interface QuizQuestion {
  id: number;
  photoUrl: string;
  photoAttribution: string;
  photos: Photo[]; // Multiple photos from the observation
  correctAnswer: AnswerOption;
  options: AnswerOption[];
  observationId: number;
  location?: {
    lat: number;
    lng: number;
    place: string;
  };
  speciesTier: Tier; // the species' mastery tier when the quiz was built
  usedTier: 0 | 1 | 2; // the distractor tier actually used
}
