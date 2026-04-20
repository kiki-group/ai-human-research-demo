export type QuestionType = "open" | "scale" | "choice";

export interface Question {
  id: string;
  prompt: string;
  type: QuestionType;
  /** Optional choice labels when type === "choice" */
  choices?: string[];
  /** Optional probe / follow-up hint for the AI moderator */
  probe?: string;
}

export interface AudienceFilters {
  ageRange?: [number, number];
  genders?: string[];
  regions?: string[];
  roles?: string[];
  traits?: string[];
}

export interface Audience {
  mode: "general" | "specific";
  filters?: AudienceFilters;
  freeText?: string;
  /** Short human-readable summary rendered as a chip on cards */
  label?: string;
  /** Target interview count for progress display */
  target?: number;
}

export interface Study {
  id: string;
  title: string;
  description: string;
  goal?: string;
  questions: Question[];
  audience?: Audience;
  status: "draft" | "pending" | "complete";
  createdAt: number;
  updatedAt: number;
  launchedAt?: number;
  simulation?: SimulationResult;
}

export interface Respondent {
  id: string;
  name: string;
  age: number;
  gender?: string;
  role: string;
  location: string;
  tags: string[];
  /** 1-sentence vibe / background */
  bio: string;
}

export interface InterviewAnswer {
  questionId: string;
  text: string;
}

export interface Interview {
  respondentId: string;
  answers: InterviewAnswer[];
  /** 1-sentence overall sentiment / note */
  summary: string;
}

export interface Theme {
  title: string;
  description: string;
  /** Quotes reference a respondent and the exact answer text */
  quotes: {
    respondentId: string;
    questionId: string;
    text: string;
  }[];
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface Report {
  summary: string;
  themes: Theme[];
  sentiment: SentimentBreakdown;
  surprises: string[];
  recommendations: string[];
}

export interface SimulationResult {
  respondents: Respondent[];
  interviews: Interview[];
  report: Report;
  generatedAt: number;
}

export type ChatRole = "user" | "model";

export interface ChatMessage {
  role: ChatRole;
  text: string;
}
