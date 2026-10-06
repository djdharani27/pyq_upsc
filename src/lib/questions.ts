import type { Question } from "@/types";

let cache: Question[] | null = null;

export async function fetchQuestions(): Promise<Question[]> {
  if (cache) return cache;
  const res = await fetch("/questions.json", { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load questions (${res.status})`);
  const data = (await res.json()) as Question[];
  cache = Array.isArray(data) ? data : [];
  return cache;
}

export function searchQuestions(
  questions: Question[],
  opts: {
    q: string;
    subjects: string[];
    topics: string[];
    exams: string[];
    years: string[];
    upscOnly: boolean;
  }
): Question[] {
  const q = opts.q.trim().toLowerCase();
  return questions.filter((item) => {
    if (opts.upscOnly && item.exam !== "UPSC CSE") return false;
    if (opts.subjects.length && !opts.subjects.includes(item.subject || "")) {
      return false;
    }
    if (opts.topics.length && !opts.topics.includes(item.topic || "")) {
      return false;
    }
    if (opts.exams.length && !opts.exams.includes(item.exam || "")) {
      return false;
    }
    if (opts.years.length && !opts.years.includes(String(item.year || ""))) {
      return false;
    }
    if (q) {
      const hay = `${item.question} ${item.subject || ""} ${item.topic || ""} ${
        item.exam || ""
      } ${item.year || ""} ${item.explanation || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
