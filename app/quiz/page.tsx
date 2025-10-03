"use client";

import { useEffect, useState } from "react";
import { INaturalistResponse, QuizQuestion } from "@/types/inaturalist";
import { generateQuizQuestions } from "@/lib/quiz";
import Image from "next/image";

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/observations?perPage=50");
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
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    loadQuiz();
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
          <div className="text-lg">
            Score: {score} / {questions.length}
          </div>
        </div>

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
          {/* Image */}
          <div
            className="relative w-full h-96 mb-6 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-zoom-in hover:opacity-90 transition-opacity"
            onClick={() => setIsImageZoomed(true)}
          >
            <Image
              src={currentQuestion.photoUrl}
              alt="Mushroom to identify"
              fill
              className="object-contain"
              priority
            />
            <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              🔍 Click to zoom
            </div>
          </div>

          <p className="text-lg font-medium mb-4">What species is this?</p>

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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            <Image
              src={currentQuestion.photoUrl}
              alt="Mushroom to identify (zoomed)"
              fill
              className="object-contain"
              priority
            />
            <button
              onClick={() => setIsImageZoomed(false)}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm"
            >
              ✕ Close
            </button>
            <div className="absolute bottom-4 left-4 right-4 text-center text-white text-sm bg-black/50 py-2 rounded">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
