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
  const [highlightedAnswer, setHighlightedAnswer] = useState<number | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [speciesInfo, setSpeciesInfo] = useState<{
    title: string;
    extract: string;
    thumbnail?: string;
    url: string;
  } | null>(null);
  const [loadingSpeciesInfo, setLoadingSpeciesInfo] = useState(false);

  useEffect(() => {
    // Try to load saved state from localStorage
    const savedState = localStorage.getItem('quizState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setQuestions(state.questions);
        setCurrentQuestionIndex(state.currentQuestionIndex);
        setScore(state.score);
        setFilters(state.filters || {});
        setLoading(false);
      } catch (e) {
        console.error('Failed to load saved quiz state:', e);
        loadQuiz();
      }
    } else {
      loadQuiz();
    }
  }, []);

  const saveQuizState = (index: number, currentScore: number) => {
    const state = {
      questions,
      currentQuestionIndex: index,
      score: currentScore,
      filters,
    };
    localStorage.setItem('quizState', JSON.stringify(state));
  };

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
      // Clear any existing saved state when starting a new quiz
      localStorage.removeItem('quizState');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpeciesInfo = async (scientificName: string) => {
    setLoadingSpeciesInfo(true);
    try {
      const response = await fetch(`/api/species-info?name=${encodeURIComponent(scientificName)}`);
      if (response.ok) {
        const data = await response.json();
        setSpeciesInfo(data);
      } else {
        setSpeciesInfo(null);
      }
    } catch (error) {
      console.error("Failed to fetch species info:", error);
      setSpeciesInfo(null);
    } finally {
      setLoadingSpeciesInfo(false);
    }
  };

  const handleAnswerHighlight = (optionIndex: number) => {
    if (isAnswered) return;
    setHighlightedAnswer(optionIndex);
  };

  const handleAnswerSubmit = () => {
    if (isAnswered || highlightedAnswer === null) return;

    setSelectedAnswer(highlightedAnswer);
    setIsAnswered(true);

    const currentQuestion = questions[currentQuestionIndex];
    const selectedOption = currentQuestion.options[highlightedAnswer];

    let newScore = score;
    if (selectedOption.taxonId === currentQuestion.correctAnswer.taxonId) {
      newScore = score + 1;
      setScore(newScore);
    }

    // Fetch species info for the correct answer
    fetchSpeciesInfo(currentQuestion.correctAnswer.scientificName);

    // Save state after answering
    saveQuizState(currentQuestionIndex, newScore);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Start transition animation (fade out)
      setIsTransitioning(true);

      // Wait for fade out, then update content
      setTimeout(() => {
        const newIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(newIndex);
        setSelectedAnswer(null);
        setHighlightedAnswer(null);
        setIsAnswered(false);
        setIsImageZoomed(false);
        setCurrentPhotoIndex(0);
        setShowLocationHint(false);
        setSpeciesInfo(null);

        // Save state to localStorage
        saveQuizState(newIndex, score);

        // Wait a frame for DOM to update, then fade in
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      }, 150);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setHighlightedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    localStorage.removeItem('quizState');
    loadQuiz();
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    handleRestart();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFilters || questions.length === 0) return;

      // ? to toggle keyboard shortcuts
      if (e.key === '?') {
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
        return;
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
          return;
        }
        if (isImageZoomed) {
          setIsImageZoomed(false);
          return;
        }
      }

      // Don't trigger shortcuts when modal is open
      if (showKeyboardShortcuts) return;

      // Z to toggle zoom modal
      if (e.key === 'z' || e.key === 'Z') {
        if (isImageZoomed) {
          setIsImageZoomed(false);
        } else {
          setIsImageZoomed(true);
        }
        return;
      }

      const currentQ = questions[currentQuestionIndex];
      const isLast = currentQuestionIndex === questions.length - 1;

      // Arrow keys to navigate photos (works both zoomed and not zoomed)
      if (e.key === 'ArrowLeft') {
        if (currentQ.photos.length > 1) {
          setCurrentPhotoIndex((prev) => (prev - 1 + currentQ.photos.length) % currentQ.photos.length);
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        if (currentQ.photos.length > 1) {
          setCurrentPhotoIndex((prev) => (prev + 1) % currentQ.photos.length);
        }
        return;
      }

      // Don't trigger other shortcuts when zoomed
      if (isImageZoomed) return;

      // Number keys 1-4 to highlight answers
      if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        if (index < currentQ.options.length) {
          handleAnswerHighlight(index);
        }
      }

      // Enter to submit highlighted answer or go to next
      if (e.key === 'Enter') {
        if (!isAnswered && highlightedAnswer !== null) {
          handleAnswerSubmit();
        } else if (isAnswered && !isLast) {
          handleNext();
        }
      }

      // R to restart quiz (when on last question after answering)
      if ((e.key === 'r' || e.key === 'R') && isAnswered && isLast) {
        handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFilters, isImageZoomed, showKeyboardShortcuts, highlightedAnswer, isAnswered, questions, currentQuestionIndex]);

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
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-forest tracking-tight">🍄 MycoMatch</h1>
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="text-xs md:text-sm text-sage hover:text-forest transition-colors underline decoration-dotted hidden sm:block"
              >
                Shortcuts
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 md:px-4 py-2 border-2 border-sage/30 text-forest rounded-xl hover:bg-sage/10 hover:border-sage/50 transition-all"
              >
                <span className="hidden sm:inline">⚙️ Filters</span>
                <span className="sm:hidden">⚙️</span>
              </button>
              <div className="text-base md:text-lg font-medium bg-sand/50 px-3 md:px-4 py-2 rounded-xl border-2 border-moss/20">
                <span className="text-sage">{score}</span>
                <span className="text-moss mx-1">/</span>
                <span className="text-moss">{questions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-8 bg-sand/30 border-2 border-sage/20 rounded-2xl shadow-xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-2xl font-serif font-bold text-forest mb-6">Quiz Filters</h2>

            <div className="space-y-5">
              {/* Taxa Filter */}
              <div>
                <label className="block font-medium text-forest mb-2.5">Mushroom Type</label>
                <select
                  value={filters.taxonId || 0}
                  onChange={(e) => setFilters({ ...filters, taxonId: Number(e.target.value) || undefined })}
                  className="w-full p-3 border-2 border-sage/30 rounded-xl bg-background text-foreground focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 outline-none transition-all"
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
                <label className="block font-medium text-forest mb-2.5">Region</label>
                <select
                  value={filters.region || "all"}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value === "all" ? undefined : e.target.value })}
                  className="w-full p-3 border-2 border-sage/30 rounded-xl bg-background text-foreground focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 outline-none transition-all"
                >
                  {REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-terracotta hover:bg-clay text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Apply & Start New Quiz
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-6 py-3 border-2 border-sage/30 text-forest rounded-xl hover:bg-sage/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium mb-3">
            <span className="text-forest">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sage">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-sand/60 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-sage to-forest h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className={`bg-white dark:bg-gray-900/50 rounded-2xl shadow-2xl border-2 border-sage/10 p-6 md:p-8 transition-opacity duration-150 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}>
          {/* Image Carousel */}
          <div className="relative mb-8">
            <div
              className="relative w-full h-96 md:h-[28rem] rounded-2xl overflow-hidden bg-sand/30 cursor-zoom-in hover:shadow-2xl transition-all border-2 border-sage/20"
              onClick={() => setIsImageZoomed(true)}
            >
              <Image
                key={`${currentQuestionIndex}-${currentPhotoIndex}`}
                src={currentQuestion.photos[currentPhotoIndex]?.url || currentQuestion.photoUrl}
                alt="Mushroom to identify"
                fill
                className="object-contain"
                priority
                unoptimized
              />
              <div className="absolute bottom-3 right-3 bg-forest/80 backdrop-blur-sm text-white p-2.5 rounded-xl shadow-lg">
                🔍
              </div>
              {currentQuestion.photos.length > 1 && (
                <div className="absolute bottom-3 left-3 bg-forest/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-sm font-medium shadow-lg">
                  {currentPhotoIndex + 1} / {currentQuestion.photos.length}
                </div>
              )}
            </div>

            {/* Photo Navigation */}
            {currentQuestion.photos.length > 1 && (
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setCurrentPhotoIndex((currentPhotoIndex - 1 + currentQuestion.photos.length) % currentQuestion.photos.length)}
                  className="px-4 py-2 border-2 border-sage/30 text-forest rounded-xl hover:bg-sage/10 transition-all"
                >
                  ←
                </button>
                <div className="flex gap-2 items-center">
                  {currentQuestion.photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        idx === currentPhotoIndex
                          ? "bg-terracotta w-8"
                          : "bg-sage/40 w-2.5 hover:bg-sage/60"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPhotoIndex((currentPhotoIndex + 1) % currentQuestion.photos.length)}
                  className="px-4 py-2 border-2 border-sage/30 text-forest rounded-xl hover:bg-sage/10 transition-all"
                >
                  →
                </button>
              </div>
            )}
          </div>

          <p className="text-xl md:text-2xl font-serif font-semibold text-forest mb-6">What species is this?</p>

          {/* Location Hint */}
          {!isAnswered && currentQuestion.location && (
            <div className="mb-6">
              <button
                onClick={() => setShowLocationHint(!showLocationHint)}
                className="w-full text-left p-4 border-2 border-sage/30 rounded-xl hover:bg-sand/20 transition-all flex justify-between items-center group"
              >
                <span className="font-medium text-forest group-hover:text-terracotta transition-colors">
                  {showLocationHint ? "🗺️ Hide Location" : "🗺️ Show Location Hint"}
                </span>
                <span className="text-sage">
                  {showLocationHint ? "▲" : "▼"}
                </span>
              </button>

              {showLocationHint && (
                <div className="mt-4 border-2 border-sage/20 rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-sand/40 p-3 text-sm font-medium text-forest">
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
              const isHighlighted = highlightedAnswer === index;
              const isSelected = selectedAnswer === index;
              const isCorrect = option.taxonId === currentQuestion.correctAnswer.taxonId;
              const showCorrect = isAnswered && isCorrect;
              const showWrong = isAnswered && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerHighlight(index)}
                  disabled={isAnswered}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 ${
                    showCorrect
                      ? "border-sage bg-sage/10 shadow-lg shadow-sage/20 scale-[1.02]"
                      : showWrong
                      ? "border-terracotta bg-terracotta/10 shadow-lg shadow-terracotta/20 scale-[0.98]"
                      : isHighlighted
                      ? "border-terracotta bg-sand/30 shadow-lg"
                      : "border-sage/30 hover:border-sage/50 hover:bg-sand/20 hover:scale-[1.01]"
                  } ${isAnswered ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-sm font-bold text-sage mt-0.5 bg-sand/50 w-7 h-7 rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-forest text-lg">{option.commonName}</div>
                      <div className="text-sm text-sage/80 font-serif italic mt-1">
                        {option.scientificName}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Submit Button */}
          {!isAnswered && highlightedAnswer !== null && (
            <button
              onClick={handleAnswerSubmit}
              className="w-full mt-6 bg-terracotta hover:bg-clay text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              Submit Answer
            </button>
          )}

          {/* Feedback and Navigation */}
          {isAnswered && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Species Info Card */}
              {loadingSpeciesInfo && (
                <div className="mb-6 p-5 bg-sand/30 border-2 border-sage/20 rounded-xl">
                  <p className="text-sm text-forest">Loading species information...</p>
                </div>
              )}

              {speciesInfo && (
                <div className="mb-6 p-6 bg-sand/30 border-2 border-sage/20 rounded-xl">
                  <h3 className="font-serif font-bold text-xl text-forest mb-3">{speciesInfo.title}</h3>
                  <p className="text-sm leading-relaxed text-forest/80 mb-4">{speciesInfo.extract}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a
                      href={speciesInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terracotta hover:text-clay font-medium hover:underline transition-colors"
                    >
                      Read more on Wikipedia →
                    </a>
                    <a
                      href={`https://www.inaturalist.org/observations/${currentQuestion.observationId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terracotta hover:text-clay font-medium hover:underline transition-colors"
                    >
                      View on iNaturalist →
                    </a>
                  </div>
                </div>
              )}

              {!loadingSpeciesInfo && !speciesInfo && (
                <div className="mb-6">
                  <a
                    href={`https://www.inaturalist.org/observations/${currentQuestion.observationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-terracotta hover:text-clay font-medium hover:underline text-sm transition-colors"
                  >
                    View observation on iNaturalist →
                  </a>
                </div>
              )}

              {isComplete ? (
                <div className="text-center">
                  <p className="text-3xl font-serif font-bold text-forest mb-4">
                    Quiz Complete! 🎉
                  </p>
                  <p className="text-xl text-sage mb-8">
                    Final Score: <span className="font-bold text-terracotta">{score}</span> / {questions.length}
                    <span className="text-moss ml-2">({Math.round((score / questions.length) * 100)}%)</span>
                  </p>
                  <button
                    onClick={handleRestart}
                    className="bg-terracotta hover:bg-clay text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Start New Quiz
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full bg-forest hover:bg-sage text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Next Question →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Photo Attribution */}
        <div className="mt-6 p-4 bg-sand/20 rounded-xl border-2 border-sage/10">
          <p className="text-xs text-forest/70 text-center font-medium">
            📷 Photo by {currentQuestion.photoAttribution} • Licensed under Creative Commons
          </p>
          <p className="text-xs text-sage/70 text-center mt-1.5">
            <a
              href={`https://www.inaturalist.org/observations/${currentQuestion.observationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-terracotta transition-colors hover:underline"
            >
              View source on iNaturalist
            </a>
          </p>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {isImageZoomed && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] animate-in zoom-in-95 duration-200">
            <Image
              src={currentQuestion.photos[currentPhotoIndex]?.url || currentQuestion.photoUrl}
              alt="Mushroom to identify (zoomed)"
              fill
              className="object-contain pointer-events-none"
              priority
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsImageZoomed(false);
              }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm z-10"
            >
              ✕
            </button>

            {/* Photo navigation in modal */}
            {currentQuestion.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex((currentPhotoIndex - 1 + currentQuestion.photos.length) % currentQuestion.photos.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm z-10"
                >
                  ←
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex((currentPhotoIndex + 1) % currentQuestion.photos.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm z-10"
                >
                  →
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                  {currentPhotoIndex + 1} / {currentQuestion.photos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div
          className="fixed inset-0 bg-forest/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowKeyboardShortcuts(false);
            }
          }}
        >
          <div className="bg-background border-2 border-sage/20 rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-forest">⌨️ Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="text-sage hover:text-terracotta transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b-2 border-sage/10">
                <span className="text-forest/80">Select answer</span>
                <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">1-4</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-sage/10">
                <span className="text-forest/80">Submit answer</span>
                <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">Enter</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-sage/10">
                <span className="text-forest/80">Navigate photos</span>
                <div className="flex gap-2">
                  <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">←</kbd>
                  <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">→</kbd>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-sage/10">
                <span className="text-forest/80">Zoom image</span>
                <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">z</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-sage/10">
                <span className="text-forest/80">Close modal</span>
                <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">Esc</kbd>
              </div>
              <div className="flex justify-between items-center py-3 border-b-2 border-sage/10">
                <span className="text-forest/80">Restart quiz</span>
                <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">r</kbd>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-forest/80">Show this help</span>
                <kbd className="px-3 py-1.5 bg-sand/40 border-2 border-sage/20 rounded-lg font-mono text-sm text-forest">?</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowKeyboardShortcuts(false)}
              className="w-full mt-8 bg-terracotta hover:bg-clay text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
