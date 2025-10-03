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
  correctAnswer: {
    scientificName: string;
    commonName: string;
    taxonId: number;
  };
  options: Array<{
    scientificName: string;
    commonName: string;
    taxonId: number;
  }>;
  observationId: number;
  location?: {
    lat: number;
    lng: number;
    place: string;
  };
}
