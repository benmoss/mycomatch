"use client";

import { useEffect, useState } from "react";
import { INaturalistResponse, QuizQuestion } from "@/types/inaturalist";
import { generateQuizQuestions } from "@/lib/quiz";
import Image from "next/image";
import { COMMON_TAXA, REGIONS, QuizFilters } from "@/types/filters";

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<QuizFilters>({});
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showLocationHint, setShowLocationHint] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query params from filters
      const params = new URLSearchParams({ perPage: "50" });

      if (filters.taxonId) {
        params.append("taxonId", filters.taxonId.toString());
      }

      if (filters.region) {
        const region = REGIONS.find(r => r.id === filters.region);
        if (region?.bounds) {
          params.append("nelat", region.bounds.nelat.toString());
          params.append("nelng", region.bounds.nelng.toString());
          params.append("swlat", region.bounds.swlat.toString());
          params.append("swlng", region.bounds.swlng.toString());
        }
      }

      const response = await fetch(`/api/observations?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch observations");

      const data: INaturalistResponse = await response.json();
      const quizQuestions = generateQuizQuestions(data.results, 10);

      if (quizQuestions.length === 0) {
        throw new Error("Could not generate quiz questions");
      }

      setQuestions(quizQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (isAnswered) return;

    setSelectedAnswer(optionIndex);
    setIsAnswered(true);

    const currentQuestion = questions[currentQuestionIndex];
    const selectedOption = currentQuestion.options[optionIndex];

    if (selectedOption.taxonId === currentQuestion.correctAnswer.taxonId) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsImageZoomed(false);
      setCurrentPhotoIndex(0);
      setShowLocationHint(false);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    loadQuiz();
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    handleRestart();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍄</div>
          <p className="text-xl">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button
            onClick={loadQuiz}
            className="bg-foreground text-background px-6 py-3 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No questions available</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isComplete = isAnswered && isLastQuestion;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">🍄 Mushroom ID Quiz</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ⚙️ Filters
            </button>
            <div className="text-lg">
              Score: {score} / {questions.length}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Quiz Filters</h2>

            <div className="space-y-4">
              {/* Taxa Filter */}
              <div>
                <label className="block font-medium mb-2">Mushroom Type</label>
                <select
                  value={filters.taxonId || 0}
                  onChange={(e) => setFilters({ ...filters, taxonId: Number(e.target.value) || undefined })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-background"
                >
                  {COMMON_TAXA.map((taxon) => (
                    <option key={taxon.id} value={taxon.id}>
                      {taxon.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Filter */}
              <div>
                <label className="block font-medium mb-2">Region</label>
                <select
                  value={filters.region || "all"}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value === "all" ? undefined : e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-background"
                >
                  {REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-foreground text-background px-4 py-2 rounded-lg font-medium"
              >
                Apply & Start New Quiz
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-foreground h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          {/* Image Carousel */}
          <div className="relative mb-6">
            <div
              className="relative w-full h-96 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-zoom-in hover:opacity-90 transition-opacity"
              onClick={() => setIsImageZoomed(true)}
            >
              <Image
                src={currentQuestion.photos[currentPhotoIndex]?.url || currentQuestion.photoUrl}
                alt="Mushroom to identify"
                fill
                className="object-contain"
                priority
              />
              <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                🔍 Click to zoom
              </div>
              {currentQuestion.photos.length > 1 && (
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {currentPhotoIndex + 1} / {currentQuestion.photos.length}
                </div>
              )}
            </div>

            {/* Photo Navigation */}
            {currentQuestion.photos.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                <button
                  onClick={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                  disabled={currentPhotoIndex === 0}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded disabled:opacity-50"
                >
                  ← Prev
                </button>
                <div className="flex gap-1 items-center">
                  {currentQuestion.photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentPhotoIndex
                          ? "bg-foreground w-6"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPhotoIndex(Math.min(currentQuestion.photos.length - 1, currentPhotoIndex + 1))}
                  disabled={currentPhotoIndex === currentQuestion.photos.length - 1}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          <p className="text-lg font-medium mb-4">What species is this?</p>

          {/* Location Hint */}
          {!isAnswered && currentQuestion.location && (
            <div className="mb-4">
              <button
                onClick={() => setShowLocationHint(!showLocationHint)}
                className="w-full text-left p-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex justify-between items-center"
              >
                <span className="font-medium">
                  {showLocationHint ? "🗺️ Hide Location" : "🗺️ Show Location"}
                </span>
                <span className="text-sm text-gray-500">
                  {showLocationHint ? "▲" : "▼"}
                </span>
              </button>

              {showLocationHint && (
                <div className="mt-3 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 text-sm text-gray-600 dark:text-gray-400">
                    📍 {currentQuestion.location.place}
                  </div>
                  <iframe
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentQuestion.location.lng - 0.1},${currentQuestion.location.lat - 0.1},${currentQuestion.location.lng + 0.1},${currentQuestion.location.lat + 0.1}&layer=mapnik&marker=${currentQuestion.location.lat},${currentQuestion.location.lng}`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = option.taxonId === currentQuestion.correctAnswer.taxonId;
              const showCorrect = isAnswered && isCorrect;
              const showWrong = isAnswered && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    showCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : showWrong
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : isSelected
                      ? "border-foreground"
                      : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                  } ${isAnswered ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="font-medium">{option.commonName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {option.scientificName}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback and Navigation */}
          {isAnswered && (
            <div className="mt-6">
              <div
                className={`p-4 rounded-lg mb-4 ${
                  selectedAnswer !== null &&
                  currentQuestion.options[selectedAnswer].taxonId ===
                    currentQuestion.correctAnswer.taxonId
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-500"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-500"
                }`}
              >
                <p className="font-bold mb-2">
                  {selectedAnswer !== null &&
                  currentQuestion.options[selectedAnswer].taxonId ===
                    currentQuestion.correctAnswer.taxonId
                    ? "✓ Correct!"
                    : "✗ Incorrect"}
                </p>
                <p>
                  The correct answer is: <strong>{currentQuestion.correctAnswer.commonName}</strong>
                  {" ("}
                  <em>{currentQuestion.correctAnswer.scientificName}</em>
                  {")"}
                </p>
              </div>

              {isComplete ? (
                <div className="text-center">
                  <p className="text-2xl font-bold mb-4">
                    Quiz Complete! 🎉
                  </p>
                  <p className="text-xl mb-6">
                    Final Score: {score} / {questions.length} (
                    {Math.round((score / questions.length) * 100)}%)
                  </p>
                  <button
                    onClick={handleRestart}
                    className="bg-foreground text-background px-6 py-3 rounded-lg font-medium"
                  >
                    Start New Quiz
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full bg-foreground text-background px-6 py-3 rounded-lg font-medium"
                >
                  Next Question
                </button>
              )}
            </div>
          )}
        </div>

        {/* Photo Attribution */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Photo: {currentQuestion.photoAttribution} (via iNaturalist)
        </p>
      </div>

      {/* Image Zoom Modal */}
      {isImageZoomed && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsImageZoomed(false);
            }
          }}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            <Image
              src={currentQuestion.photos[currentPhotoIndex]?.url || currentQuestion.photoUrl}
              alt="Mushroom to identify (zoomed)"
              fill
              className="object-contain"
              priority
            />
            <button
              onClick={() => setIsImageZoomed(false)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm z-10"
            >
              ✕ Close
            </button>

            {/* Photo navigation in modal */}
            {currentQuestion.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1));
                  }}
                  disabled={currentPhotoIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm disabled:opacity-50 z-10"
                >
                  ← Prev
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(Math.min(currentQuestion.photos.length - 1, currentPhotoIndex + 1));
                  }}
                  disabled={currentPhotoIndex === currentQuestion.photos.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm disabled:opacity-50 z-10"
                >
                  Next →
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                  {currentPhotoIndex + 1} / {currentQuestion.photos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
