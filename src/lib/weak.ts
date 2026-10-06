"use client";

import type { Question, WeakAttempt } from "@/types";
import { WEAK_STORAGE_KEY } from "./filters";

export function readWeakMap(): Record<string, WeakAttempt> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WEAK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeWeakMap(map: Record<string, WeakAttempt>) {
  try {
    localStorage.setItem(WEAK_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

export function recordWrongAttempt(
  question: Question,
  selected: string
): Record<string, WeakAttempt> {
  const map = readWeakMap();
  const existing = map[question.id];
  map[question.id] = {
    questionId: question.id,
    selected,
    correct: question.answer,
    wrongCount: (existing?.wrongCount || 0) + 1,
    lastWrongAt: Date.now(),
    fixed: false,
    exam: question.exam,
    year: question.year,
    subject: question.subject,
    topic: question.topic,
    preview: (question.question || "").slice(0, 160),
  };
  writeWeakMap(map);
  return map;
}

export function markFixed(questionId: string): Record<string, WeakAttempt> {
  const map = readWeakMap();
  if (map[questionId]) {
    map[questionId].fixed = true;
    writeWeakMap(map);
  }
  return map;
}

export function removeFromWeak(questionId: string): Record<string, WeakAttempt> {
  const map = readWeakMap();
  delete map[questionId];
  writeWeakMap(map);
  return map;
}

export function clearWeak(): Record<string, WeakAttempt> {
  writeWeakMap({});
  return {};
}

export function getWeakList(
  includeFixed = false
): WeakAttempt[] {
  const map = readWeakMap();
  return Object.values(map)
    .filter((a) => (includeFixed ? true : !a.fixed))
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt);
}

export function weakCount(): number {
  return getWeakList(false).length;
}
