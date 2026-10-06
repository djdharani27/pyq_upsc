"use client";

import { useMemo, useState } from "react";
import type { Question } from "@/types";

function formatExplanation(text: string) {
  // Lightweight markdown-ish rendering for **bold**, *italic*, headings, lists
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) => {
    const key = `l-${i}`;
    if (/^###\s+/.test(line)) {
      return (
        <h4 key={key} className="mt-3 text-sm font-semibold text-foreground">
          {line.replace(/^###\s+/, "")}
        </h4>
      );
    }
    if (/^##\s+/.test(line)) {
      return (
        <h3 key={key} className="mt-3 text-sm font-semibold text-foreground">
          {line.replace(/^##\s+/, "")}
        </h3>
      );
    }
    if (/^[-*]\s+/.test(line)) {
      return (
        <li key={key} className="ml-4 list-disc text-sm text-muted-fg">
          {renderInline(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
    }
    if (!line.trim()) return <div key={key} className="h-2" />;
    return (
      <p key={key} className="text-sm leading-relaxed text-muted-fg">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function QuestionCard({
  question,
  selectedOption,
  onSelectOption,
  onReset,
  onWrong,
  mode = "practice",
  showCorrectOnly,
}: {
  question: Question;
  selectedOption: string | null;
  onSelectOption: (questionId: string, option: string) => void;
  onReset?: (questionId: string) => void;
  onWrong?: (question: Question, selected: string) => void;
  mode?: "practice" | "weak";
  showCorrectOnly?: boolean;
}) {
  const [showExp, setShowExp] = useState(false);
  const optionKeys = useMemo(
    () => Object.keys(question.options || {}).sort(),
    [question.options]
  );
  const answered = selectedOption !== null;
  const isCorrect = answered && selectedOption === question.answer;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        {question.exam && (
          <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-muted-fg">
            {question.exam}
          </span>
        )}
        {question.year && (
          <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-muted-fg">
            {question.year}
          </span>
        )}
        {question.subject && (
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
            {question.subject}
          </span>
        )}
        {question.topic && (
          <span className="max-w-[220px] truncate rounded-md bg-secondary px-2 py-0.5 font-medium text-muted-fg">
            {question.topic}
          </span>
        )}
      </div>

      <div className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {question.question}
      </div>

      <div className="flex flex-col gap-2">
        {optionKeys.map((key) => {
          const disabled = answered && mode !== "weak";
          let cls =
            "border-border bg-secondary/40 text-foreground hover:border-primary/40 hover:bg-secondary";
          if (answered) {
            if (key === question.answer) {
              cls =
                "border-success/50 bg-success/10 text-success font-medium";
            } else if (key === selectedOption && !isCorrect) {
              cls =
                "border-destructive/50 bg-destructive/10 text-destructive font-medium";
            } else if (mode === "weak" && !showCorrectOnly) {
              cls = "border-border bg-secondary/30 text-muted-fg opacity-70";
            } else if (mode === "weak") {
              cls = "border-success/50 bg-success/10 text-success font-medium";
            } else {
              cls = "border-border bg-secondary/20 text-muted-fg opacity-60";
            }
          }
          return (
            <button
              key={key}
              type="button"
              disabled={disabled && mode === "practice"}
              onClick={() => {
                if (answered && mode === "practice") return;
                onSelectOption(question.id, key);
                if (mode !== "practice") {
                  if (key !== question.answer && onWrong) {
                    onWrong(question, key);
                  }
                }
              }}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all ${cls} ${
                disabled && mode === "practice" ? "cursor-default" : ""
              }`}
            >
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-current text-[11px] font-bold">
                {key}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap">
                {question.options[key]}
              </span>
              {answered && key === question.answer && (
                <span className="mt-0.5 text-xs font-semibold">✓</span>
              )}
              {answered && key === selectedOption && !isCorrect && (
                <span className="mt-0.5 text-xs font-semibold">✕</span>
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4">
          <div
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
              isCorrect
                ? "border-success/40 bg-success/10 text-success"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {isCorrect
              ? "Correct! Well done."
              : `Incorrect — correct answer is ${question.answer}`}
          </div>

          {onReset && (
            <button
              type="button"
              onClick={() => onReset(question.id)}
              className="mt-2 cursor-pointer text-xs font-medium text-primary hover:underline"
            >
              Reset this question
            </button>
          )}

          {question.explanation && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowExp((v) => !v)}
                className="cursor-pointer text-xs font-semibold text-primary hover:underline"
              >
                {showExp ? "Hide explanation" : "Show explanation"}
              </button>
              {showExp && (
                <div className="explain-md mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-secondary/20 p-3 scrollbar-thin">
                  {formatExplanation(question.explanation)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
