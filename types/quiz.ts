// 0 easy (different families), 1 medium (same family), 2 hard (look-alikes), 3 mastered
export type Tier = 0 | 1 | 2 | 3;

export interface PoolSpecies {
  taxonId: number;
  scientificName: string;
  commonName: string;
  observationCount: number;
  genusId: number;
  familyId: number;
  orderId: number;
}

export interface Lookalike {
  taxonId: number;
  scientificName: string;
  commonName: string;
  confusionCount: number;
}

export interface AnswerOption {
  scientificName: string;
  commonName: string;
  taxonId: number;
}

export interface SpeciesProgress {
  taxonId: number;
  tier: Tier;
  streak: number; // consecutive correct at current tier
  seen: number;
  correct: number;
  lastSeen: string; // ISO date
  confusions: Record<number, number>; // taxonId picked instead -> count
}

export type ProgressStore = Record<number, SpeciesProgress>;
