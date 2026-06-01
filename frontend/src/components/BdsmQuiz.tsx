"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  bdsmQuizQuestions,
  bdsmQuizResults,
  type QuizAnswer,
  type QuizResult,
} from "@/lib/bdsm-seo-content";

function getResult(answers: QuizAnswer[]): QuizResult {
  const scores = new Map<string, number>();

  for (const answer of answers) {
    for (const [resultId, score] of Object.entries(answer.scores)) {
      scores.set(resultId, (scores.get(resultId) || 0) + score);
    }
  }

  const winner = bdsmQuizResults.reduce((best, candidate) => {
    const bestScore = scores.get(best.id) || 0;
    const candidateScore = scores.get(candidate.id) || 0;
    return candidateScore > bestScore ? candidate : best;
  }, bdsmQuizResults[bdsmQuizResults.length - 1]);

  return winner;
}

export default function BdsmQuiz() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);

  const currentQuestion = bdsmQuizQuestions[currentIndex];
  const selectedAnswer = answers[currentIndex];
  const isComplete = answers.length === bdsmQuizQuestions.length;
  const progress = Math.round((answers.length / bdsmQuizQuestions.length) * 100);

  const result = useMemo(() => {
    if (!isComplete) return null;
    return getResult(answers);
  }, [answers, isComplete]);

  function chooseAnswer(answer: QuizAnswer) {
    setAnswers((existing) => {
      const next = existing.slice(0, currentIndex);
      next[currentIndex] = answer;
      return next;
    });
  }

  function goNext() {
    if (!selectedAnswer) return;
    if (currentIndex < bdsmQuizQuestions.length - 1) {
      setCurrentIndex((index) => index + 1);
    }
  }

  function goBack() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function resetQuiz() {
    setCurrentIndex(0);
    setAnswers([]);
  }

  if (result) {
    return (
      <section className="rounded-lg border border-border bg-background-secondary p-4 sm:p-6" aria-live="polite">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Your BDSM test result
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">{result.title}</h2>
          </div>
          <button
            type="button"
            onClick={resetQuiz}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground-muted transition-colors hover:border-accent hover:text-accent"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retake
          </button>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground-muted sm:text-base">
          {result.summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {result.traits.map((trait) => (
            <span key={trait} className="category-pill">
              {trait}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={result.categoryHref}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Browse {result.categoryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/bdsm-meaning"
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground-muted transition-colors hover:border-accent hover:text-accent"
          >
            Read BDSM meaning guide
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-background-secondary p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Question {currentIndex + 1} of {bdsmQuizQuestions.length}
          </p>
          <h2 className="mt-2 text-xl font-bold leading-tight text-foreground sm:text-2xl">
            {currentQuestion.prompt}
          </h2>
        </div>
        <span className="text-sm font-semibold text-foreground-muted">{progress}%</span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-background-tertiary">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-6 grid gap-3">
        {currentQuestion.answers.map((answer) => {
          const isSelected = selectedAnswer?.label === answer.label;

          return (
            <button
              key={answer.label}
              type="button"
              onClick={() => chooseAnswer(answer)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background-tertiary text-foreground-muted hover:border-border-hover hover:text-foreground"
              }`}
            >
              <span className="block text-sm font-semibold text-foreground">{answer.label}</span>
              <span className="mt-1 block text-sm leading-relaxed">{answer.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={currentIndex === 0}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        {currentIndex === bdsmQuizQuestions.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              if (selectedAnswer) chooseAnswer(selectedAnswer);
            }}
            disabled={!selectedAnswer}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            See result
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!selectedAnswer}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
