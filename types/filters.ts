export interface QuizFilters {
  taxonId?: number;
  region?: string;
  difficulty?: "easy" | "medium" | "hard";
}

// Fungal phyla for filtering (from iNaturalist API)
export const COMMON_TAXA = [
  { id: 0, name: "All Fungi", taxonId: undefined },
  { id: 47169, name: "Basidiomycota (12.5M obs - most mushrooms)", taxonId: 47169 },
  { id: 48250, name: "Ascomycota (4M obs - cups, morels, lichens)", taxonId: 48250 },
  { id: 1094433, name: "Mucoromycota (19K obs - pin molds)", taxonId: 1094433 },
  { id: 55113, name: "Zygomycota (16K obs)", taxonId: 55113 },
  { id: 125609, name: "Chytridiomycota (1.5K obs - chytrids)", taxonId: 125609 },
];

// Geographic regions (using rough bounding boxes)
export const REGIONS = [
  { id: "all", name: "Worldwide", bounds: undefined },
  { id: "na-west", name: "Western North America", bounds: { nelat: 60, nelng: -100, swlat: 25, swlng: -130 } },
  { id: "na-east", name: "Eastern North America", bounds: { nelat: 50, nelng: -65, swlat: 25, swlng: -100 } },
  { id: "europe", name: "Europe", bounds: { nelat: 70, nelng: 40, swlat: 35, swlng: -10 } },
  { id: "australia", name: "Australia", bounds: { nelat: -10, nelng: 155, swlat: -45, swlng: 110 } },
];

export interface RegionBounds {
  nelat: number;
  nelng: number;
  swlat: number;
  swlng: number;
}
