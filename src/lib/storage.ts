import type { Study } from "./types";

const KEY_API = "loom.geminiKey";
const KEY_STUDIES = "loom.studies";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY_API);
  } catch {
    return null;
  }
}

export function setApiKey(key: string) {
  localStorage.setItem(KEY_API, key);
}

export function clearApiKey() {
  localStorage.removeItem(KEY_API);
}

export function loadStudies(): Study[] {
  try {
    const raw = localStorage.getItem(KEY_STUDIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Study[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveStudies(studies: Study[]) {
  localStorage.setItem(KEY_STUDIES, JSON.stringify(studies));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-3)}`;
}
