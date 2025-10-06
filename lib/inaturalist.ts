import { INaturalistResponse, Observation } from "@/types/inaturalist";

const INATURALIST_API_BASE = "https://api.inaturalist.org/v1";

export interface FetchObservationsParams {
  taxonId?: number;
  iconicTaxa?: string;
  qualityGrade?: string;
  photos?: boolean;
  perPage?: number;
  page?: number;
  identifications?: string;
  geoprivacy?: string;
  photoLicense?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  nelat?: number;
  nelng?: number;
  swlat?: number;
  swlng?: number;
}

export async function fetchMushroomObservations(
  params: FetchObservationsParams = {}
): Promise<INaturalistResponse> {
  const defaultParams: FetchObservationsParams = {
    qualityGrade: "research",
    photos: true,
    perPage: 50,
    page: 1,
    identifications: "most_agree",
    geoprivacy: "open",
    // Only use photos with permissive Creative Commons licenses
    photoLicense: "cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa,cc0",
  };

  // Only use iconicTaxa if no specific taxonId is provided
  if (!params.taxonId) {
    defaultParams.iconicTaxa = "Fungi";
  }

  const queryParams = new URLSearchParams();
  const mergedParams = { ...defaultParams, ...params };

  // Convert camelCase to snake_case for API
  const keyMap: Record<string, string> = {
    taxonId: "taxon_id",
    iconicTaxa: "iconic_taxa",
    qualityGrade: "quality_grade",
    perPage: "per_page",
    photoLicense: "photo_license",
  };

  Object.entries(mergedParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const apiKey = keyMap[key] || key;
      queryParams.append(apiKey, value.toString());
    }
  });

  const url = `${INATURALIST_API_BASE}/observations?${queryParams.toString()}`;

  console.log("Fetching iNaturalist URL:", url);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MushroomIDApp/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`iNaturalist API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchTaxonDetails(taxonId: number) {
  const url = `${INATURALIST_API_BASE}/taxa/${taxonId}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MushroomIDApp/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`iNaturalist API error: ${response.status}`);
  }

  return response.json();
}

// Get a high quality photo URL from an observation
export function getPhotoUrl(observation: Observation, size: "small" | "medium" | "large" = "medium"): string | null {
  if (!observation.photos || observation.photos.length === 0) {
    return null;
  }

  const photo = observation.photos[0];
  const baseUrl = photo.url;

  // iNaturalist photo URLs have size modifiers
  const sizeMap = {
    small: "small",
    medium: "medium",
    large: "large",
  };

  return baseUrl.replace("square", sizeMap[size]);
}

// Helper to format species name for display
export function formatSpeciesName(observation: Observation): {
  scientificName: string;
  commonName: string;
} {
  return {
    scientificName: observation.taxon.name,
    commonName: observation.taxon.preferred_common_name || observation.taxon.name,
  };
}
