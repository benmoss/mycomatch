import { describe, expect, it } from "vitest";
import { clearSession, loadSession, QuizSession, saveSession } from "@/lib/session";
import { QuizQuestion } from "@/types/inaturalist";
import { fakeStorage } from "@/test/helpers";

const question: QuizQuestion = {
  id: 1,
  photoUrl: "https://example.com/large.jpg",
  photoAttribution: "(c) someone",
  photos: [],
  correctAnswer: { taxonId: 1, scientificName: "A a", commonName: "A" },
  options: [],
  observationId: 1,
  speciesTier: 0,
  usedTier: 0,
};

const session: QuizSession = {
  questions: [question],
  currentQuestionIndex: 0,
  score: 1,
  filters: { region: "na-west" },
  answers: { 0: 2 },
  promoted: [1],
};

describe("quiz session", () => {
  it("round-trips answers and promotions", () => {
    const storage = fakeStorage();
    saveSession(session, storage);
    expect(loadSession(storage)).toEqual(session);
  });

  it("removes the legacy quizState key and returns null without a v2 session", () => {
    const storage = fakeStorage({ quizState: JSON.stringify({ questions: [] }) });
    expect(loadSession(storage)).toBeNull();
    expect(storage.getItem("quizState")).toBeNull();
  });

  it("returns null on corrupt JSON", () => {
    expect(loadSession(fakeStorage({ "mycomatch.quizState.v2": "{nope" }))).toBeNull();
  });

  it("returns null when storage throws", () => {
    const storage = fakeStorage();
    storage.getItem = () => {
      throw new Error("denied");
    };
    expect(loadSession(storage)).toBeNull();
  });

  it("returns null when questions are missing usedTier", () => {
    const oldQuestion: Partial<QuizQuestion> = { ...question };
    delete oldQuestion.usedTier;
    const storage = fakeStorage({
      "mycomatch.quizState.v2": JSON.stringify({ ...session, questions: [oldQuestion] }),
    });
    expect(loadSession(storage)).toBeNull();
  });

  it("clearSession removes the session", () => {
    const storage = fakeStorage();
    saveSession(session, storage);
    clearSession(storage);
    expect(loadSession(storage)).toBeNull();
  });
});

describe("quiz session storage access throwing", () => {
  it("survives window.localStorage throwing on access", () => {
    const g = globalThis as { window?: unknown };
    const original = g.window;
    g.window = {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    };
    try {
      expect(loadSession()).toBeNull();
      expect(() => saveSession(session)).not.toThrow();
      expect(() => clearSession()).not.toThrow();
    } finally {
      g.window = original;
    }
  });
});
