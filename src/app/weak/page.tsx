"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Trash2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  ListFilter,
} from "lucide-react";
import type { Question, WeakAttempt } from "@/types";
import { fetchQuestions } from "@/lib/questions";
import {
  clearWeak,
  getWeakList,
  markFixed,
  removeFromWeak,
} from "@/lib/weak";
import { QuestionCard } from "@/components/QuestionCard";
import { FilterDropdown } from "@/components/FilterDropdown";

function emitWeak() {
  window.dispatchEvent(new CustomEvent("pyq-weak-updated"));
}

export default function WeakPage() {
  const [attempts, setAttempts] = useState<WeakAttempt[]>([]);
  const [questionsById, setQuestionsById] = useState<Map<string, Question>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string[]>([]);
  const [mode, setMode] = useState<"review" | "test">("review");
  const [testIndex, setTestIndex] = useState(0);
  const [testSelected, setTestSelected] = useState<Record<string, string>>({});
  const [testWrongIds, setTestWrongIds] = useState<Set<string>>(new Set());
  const [showFixed, setShowFixed] = useState(false);

  useEffect(() => {
    setAttempts(getWeakList(showFixed));
  }, [showFixed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchQuestions();
        if (cancelled) return;
        const map = new Map(data.map((q) => [q.id, q]));
        setQuestionsById(map);
      } catch {
        // questions may still be partial; review list still works with metadata
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved = useMemo(() => {
    return attempts
      .map((a) => {
        const q = questionsById.get(a.questionId);
        if (!q) return null;
        return { attempt: a, question: q };
      })
      .filter(Boolean) as { attempt: WeakAttempt; question: Question }[];
  }, [attempts, questionsById]);

  const subjectOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of resolved) {
      const s = item.question.subject || "Unknown";
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count
    );
  }, [resolved]);

  const filtered = useMemo(() => {
    return resolved.filter(
      (item) =>
        !subjectFilter.length ||
        subjectFilter.includes(item.question.subject || "Unknown")
    );
  }, [resolved, subjectFilter]);

  const refresh = useCallback(() => {
    setAttempts(getWeakList(showFixed));
    emitWeak();
  }, [showFixed]);

  const handleFixed = useCallback(
    (id: string) => {
      markFixed(id);
      refresh();
    },
    [refresh]
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeFromWeak(id);
      refresh();
    },
    [refresh]
  );

  const handleClearAll = useCallback(() => {
    clearWeak();
    refresh();
  }, [refresh]);

  const testQuestions = useMemo(
    () => filtered.map((f) => f.question),
    [filtered]
  );

  const startTest = useCallback(() => {
    setTestIndex(0);
    setTestSelected({});
    setTestWrongIds(new Set());
    setMode("test");
  }, []);

  const handleTestSelect = useCallback(
    (questionId: string, option: string) => {
      setTestSelected((prev) => {
        if (prev[questionId]) return prev;
        return { ...prev, [questionId]: option };
      });
      const q = questionsById.get(questionId);
      if (q && option !== q.answer) {
        setTestWrongIds((prev) => {
          const next = new Set(prev);
          next.add(questionId);
          return next;
        });
      } else if (q && option === q.answer) {
        // Correct in weak-test = fixed
        markFixed(questionId);
      }
    },
    [questionsById]
  );

  const testCurrent = testQuestions[testIndex];
  const testDone = mode === "test" && testIndex >= testQuestions.length;

  if (loading) {
    return (
      <div className="no-select mt-16 flex flex-col items-center justify-center gap-3 text-muted-fg">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Loading weak questions…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Weak / Fix
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Review every wrong attempt, then retake a test until it sticks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFixed((v) => !v)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              showFixed
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            {showFixed ? "Hiding fixed" : "Include fixed"}
          </button>
          {attempts.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="no-select mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
          <h2 className="text-base font-semibold text-foreground">
            No weak questions yet
          </h2>
          <p className="mt-2 text-sm text-muted-fg">
            Answer questions on the home page. Any wrong attempt is saved here
            automatically so you can fix it later.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90"
          >
            <PlayCircle className="h-4 w-4" />
            Start practicing
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-fg">
              Weak questions:{" "}
              <span className="font-semibold text-foreground">
                {filtered.length}
              </span>
              {subjectFilter.length > 0 && (
                <span className="text-muted-fg">
                  {" "}
                  (filtered from {resolved.length})
                </span>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown
                label="Subjects"
                options={subjectOptions}
                selected={subjectFilter}
                onChange={setSubjectFilter}
                allLabel="All Subjects"
              />
              {mode === "review" && (
                <button
                  type="button"
                  onClick={startTest}
                  disabled={filtered.length === 0}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  Retake test ({filtered.length})
                </button>
              )}
              {mode === "test" && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("review");
                    setAttempts(getWeakList(showFixed));
                    emitWeak();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Back to review
                </button>
              )}
            </div>
          </div>

          {mode === "review" && (
            <div className="flex flex-col gap-4">
              {filtered.map(({ attempt, question }) => (
                <div key={attempt.questionId} className="relative">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 font-semibold text-destructive">
                      <XCircle className="h-3 w-3" />
                      Wrong ×{attempt.wrongCount}
                    </span>
                    <span className="text-muted-fg">
                      You chose{" "}
                      <strong className="text-destructive">
                        {attempt.selected}
                      </strong>
                      {" · "}Correct is{" "}
                      <strong className="text-success">{question.answer}</strong>
                    </span>
                    {attempt.fixed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 font-semibold text-success">
                        <CheckCircle2 className="h-3 w-3" /> Fixed
                      </span>
                    )}
                  </div>
                  <QuestionCard
                    question={question}
                    selectedOption={attempt.fixed ? question.answer : attempt.selected}
                    onSelectOption={() => {}}
                    mode="practice"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!attempt.fixed && (
                      <button
                        type="button"
                        onClick={() => handleFixed(attempt.questionId)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/20"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark as fixed
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(attempt.questionId)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="no-select rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-fg">
                  No weak questions match this subject filter.
                </div>
              )}
            </div>
          )}

          {mode === "test" && (
            <div>
              {!testDone && testCurrent ? (
                <>
                  <div className="mb-4 flex items-center justify-between text-sm text-muted-fg">
                    <span>
                      Question{" "}
                      <span className="font-semibold text-foreground">
                        {testIndex + 1}
                      </span>{" "}
                      / {testQuestions.length}
                    </span>
                    <span>
                      Wrong this session:{" "}
                      <span className="font-semibold text-destructive">
                        {testWrongIds.size}
                      </span>
                    </span>
                  </div>
                  <QuestionCard
                    question={testCurrent}
                    selectedOption={testSelected[testCurrent.id] ?? null}
                    onSelectOption={handleTestSelect}
                    mode="weak"
                  />
                  <div className="mt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setTestIndex((i) => Math.max(0, i - 1))
                      }
                      disabled={testIndex === 0}
                      className="cursor-pointer rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestIndex((i) => i + 1)}
                      className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90"
                    >
                      {testIndex + 1 >= testQuestions.length
                        ? "Finish test"
                        : "Next"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="no-select mx-auto mt-6 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
                  <h2 className="text-base font-semibold text-foreground">
                    Test complete
                  </h2>
                  <p className="mt-2 text-sm text-muted-fg">
                    Wrong answers this session:{" "}
                    <span className="font-semibold text-destructive">
                      {testWrongIds.size}
                    </span>
                    . Correct answers were marked fixed automatically.
                  </p>
                  <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={startTest}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Retake again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("review");
                        setAttempts(getWeakList(false));
                        setShowFixed(false);
                        emitWeak();
                      }}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Back to weak list
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
