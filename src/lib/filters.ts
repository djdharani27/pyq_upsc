import type { Filters } from "@/types";
import filtersJson from "@/data/filters.json";

export const WEAK_STORAGE_KEY = "pyq_weak_attempts";

export function getFilters(): Filters {
  return {
    subjects: filtersJson.subjects || [],
    exams: filtersJson.exams || [],
    years: filtersJson.years || [],
    subjectTopics: filtersJson.subjectTopics || {},
  };
}
