export type Question = {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation?: string;
  tags?: string;
  exam?: string | null;
  year?: string | null;
  subject?: string | null;
  topic?: string | null;
};

export type FilterOption = {
  name: string;
  count: number;
};

export type Filters = {
  subjects: FilterOption[];
  exams: FilterOption[];
  years: string[];
  subjectTopics: Record<string, string[]>;
};

export type WeakAttempt = {
  questionId: string;
  selected: string;
  correct: string;
  wrongCount: number;
  lastWrongAt: number;
  fixed?: boolean;
  exam?: string | null;
  year?: string | null;
  subject?: string | null;
  topic?: string | null;
  preview?: string;
};
