"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, BookOpen, Bookmark, GraduationCap, Calendar, AlertTriangle } from "lucide-react";
import type { Question } from "@/types";
import { getFilters } from "@/lib/filters";
import { fetchQuestions, searchQuestions } from "@/lib/questions";
import { recordWrongAttempt } from "@/lib/weak";
import { FilterDropdown, ActiveChips } from "@/components/FilterDropdown";
import { QuestionCard } from "@/components/QuestionCard";

const PAGE = 40;

export default function HomePage() {
  const filters = useMemo(() => getFilters(), []);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [exams, setExams] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [upscOnly, setUpscOnly] = useState(false);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchQuestions();
        if (!cancelled) {
          setQuestions(data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Unable to load question bank"
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const results = useMemo(
    () =>
      searchQuestions(questions, {
        q: debounced,
        subjects,
        topics,
        exams,
        years,
        upscOnly,
      }),
    [questions, debounced, subjects, topics, exams, years, upscOnly]
  );

  useEffect(() => {
    setVisibleCount(PAGE);
  }, [debounced, subjects, topics, exams, years, upscOnly]);

  const pageItems = results.slice(0, visibleCount);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= results.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE, results.length));
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visibleCount, results.length]);

  const topicOptions = useMemo(() => {
    const map = filters.subjectTopics || {};
    const pool = subjects.length
      ? subjects.flatMap((s) => map[s] || [])
      : Object.values(map).flat();
    const counts = new Map<string, number>();
    for (const q of questions) {
      if (subjects.length && !subjects.includes(q.subject || "")) continue;
      if (q.topic) counts.set(q.topic, (counts.get(q.topic) || 0) + 1);
    }
    return Array.from(new Set(pool))
      .map((name) => ({ name, count: counts.get(name) || 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [filters.subjectTopics, subjects, questions]);

  const handleSubjectChange = useCallback(
    (next: string[]) => {
      setSubjects(next);
      if (next.length) {
        const allowed = new Set(
          next.flatMap((s) => filters.subjectTopics?.[s] || [])
        );
        setTopics((prev) => prev.filter((t) => allowed.has(t)));
      } else {
        setTopics([]);
      }
    },
    [filters.subjectTopics]
  );

  const handleSelect = useCallback((questionId: string, option: string) => {
    setSelected((prev) => {
      if (prev[questionId]) return prev;
      return { ...prev, [questionId]: option };
    });
  }, []);

  const handleReset = useCallback((questionId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  const handleWrong = useCallback((question: Question, selectedOpt: string) => {
    recordWrongAttempt(question, selectedOpt);
    window.dispatchEvent(new CustomEvent("pyq-weak-updated"));
  }, []);

  const resetAll = useCallback(() => {
    setQuery("");
    setDebounced("");
    setSubjects([]);
    setTopics([]);
    setExams([]);
    setYears([]);
    setUpscOnly(false);
    setSelected({});
    setVisibleCount(PAGE);
  }, []);

  return (
    <div>
      <div className="mx-auto mb-6">
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <FilterDropdown
              label="Subjects"
              icon={<BookOpen className="h-3.5 w-3.5 flex-none" />}
              options={filters.subjects}
              selected={subjects}
              onChange={handleSubjectChange}
              allLabel="All Subjects"
            />
            <FilterDropdown
              label="Topics"
              icon={<Bookmark className="h-3.5 w-3.5 flex-none" />}
              options={topicOptions}
              selected={topics}
              onChange={setTopics}
              allLabel="All Topics"
            />
          </div>
          <ActiveChips
            label="Subjects"
            items={subjects}
            onRemove={(name) =>
              handleSubjectChange(subjects.filter((s) => s !== name))
            }
            onClearAll={() => handleSubjectChange([])}
          />
          <ActiveChips
            label="Topics"
            items={topics}
            onRemove={(name) => setTopics(topics.filter((t) => t !== name))}
            onClearAll={() => setTopics([])}
          />
        </div>

        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-fg" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setDebounced(query);
            }}
            placeholder="Search questions, topics, keywords…"
            aria-label="Search questions"
            className="w-full rounded-2xl border border-muted-fg/30 bg-card py-3.5 pl-12 pr-14 text-base outline-none transition-shadow placeholder:text-muted-fg focus:border-muted-fg/50 focus:ring-2 focus:ring-muted-fg/20"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDebounced(query)}
              aria-label="Submit search"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <span className="no-select text-sm text-muted-fg">
            Results:{" "}
            <span className="font-semibold text-foreground">
              {loading ? "…" : results.length}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <FilterDropdown
              label="Exams"
              icon={<GraduationCap className="h-3.5 w-3.5 flex-none" />}
              options={filters.exams}
              selected={exams}
              onChange={setExams}
              disabled={upscOnly}
              allLabel="All Exams"
            />
            <FilterDropdown
              label="Years"
              icon={<Calendar className="h-3.5 w-3.5 flex-none" />}
              options={filters.years.map((y) => ({ name: String(y) }))}
              selected={years}
              onChange={setYears}
              allLabel="All Years"
            />
            <label className="no-select flex cursor-pointer items-center gap-2 text-sm">
              <span className="text-muted-fg">UPSC CSE Only</span>
              <span className="relative inline-flex">
                <input
                  type="checkbox"
                  checked={upscOnly}
                  onChange={(e) => {
                    setUpscOnly(e.target.checked);
                    if (e.target.checked) setExams([]);
                  }}
                  className="peer sr-only"
                />
                <span className="h-6 w-10 rounded-full bg-secondary transition-colors peer-checked:bg-primary" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
            <button
              type="button"
              onClick={resetAll}
              className="cursor-pointer text-xs font-medium text-muted-fg underline-offset-2 hover:text-foreground hover:underline"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="no-select mt-16 flex flex-col items-center justify-center gap-3 text-muted-fg">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading question bank…</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="no-select mx-auto mt-12 max-w-md rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Could not load questions
          </h3>
          <p className="mt-1 text-sm text-muted-fg">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && results.length === 0 && (
        <div className="no-select mt-16 text-center">
          <p className="text-base font-medium text-foreground">
            No questions found
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            Try a different keyword, turn off the UPSC filter, or adjust the
            year/exam selection.
          </p>
        </div>
      )}

      {!loading && !loadError && results.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            {pageItems.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                selectedOption={selected[q.id] ?? null}
                onSelectOption={handleSelect}
                onReset={handleReset}
                onWrong={handleWrong}
              />
            ))}
          </div>
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
          {visibleCount < results.length && (
            <div className="no-select flex items-center justify-center gap-2 py-6 text-sm text-muted-fg">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more…
            </div>
          )}
        </>
      )}
    </div>
  );
}
