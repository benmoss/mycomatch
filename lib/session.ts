import { QuizFilters } from "@/types/filters";
import { QuizQuestion } from "@/types/inaturalist";

const STORAGE_KEY = "mycomatch.quizState.v2";
const LEGACY_KEY = "quizState";

export interface QuizSession {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  filters: QuizFilters;
  answers: Record<number, number>; // question index -> chosen option index
  promoted: number[]; // taxonIds promoted during this quiz
}

function defaultStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function isSession(value: unknown): value is QuizSession {
  const s = value as QuizSession;
  return (
    !!s &&
    Array.isArray(s.questions) &&
    s.questions.every((q) => typeof q?.usedTier === "number") &&
    typeof s.currentQuestionIndex === "number" &&
    typeof s.answers === "object" &&
    Array.isArray(s.promoted)
  );
}

/** Load the in-progress quiz, or null if there is none or it's unreadable */
export function loadSession(storage: Storage | undefined = defaultStorage()): QuizSession | null {
  try {
    // Quizzes saved before the mastery ramp have an incompatible shape
    storage?.removeItem(LEGACY_KEY);
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: QuizSession, storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage unavailable: the quiz just won't resume after a reload
  }
}

export function clearSession(storage: Storage | undefined = defaultStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable
  }
}
