import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { Audience, Study, SimulationResult } from "../lib/types";
import {
  clearApiKey,
  getApiKey,
  loadStudies,
  saveStudies,
  setApiKey as persistApiKey,
  uid,
} from "../lib/storage";

type Action =
  | { type: "hydrate"; studies: Study[] }
  | { type: "upsert"; study: Study }
  | { type: "delete"; id: string }
  | {
      type: "patch";
      id: string;
      patch: Partial<Study>;
    }
  | { type: "setAudience"; id: string; audience: Audience }
  | { type: "setSimulation"; id: string; simulation: SimulationResult }
  | { type: "setStatus"; id: string; status: Study["status"] };

function reducer(state: Study[], action: Action): Study[] {
  const now = Date.now();
  switch (action.type) {
    case "hydrate":
      return action.studies;
    case "upsert": {
      const idx = state.findIndex((s) => s.id === action.study.id);
      if (idx === -1)
        return [{ ...action.study, updatedAt: now }, ...state];
      const next = state.slice();
      next[idx] = { ...action.study, updatedAt: now };
      return next;
    }
    case "delete":
      return state.filter((s) => s.id !== action.id);
    case "patch":
      return state.map((s) =>
        s.id === action.id ? { ...s, ...action.patch, updatedAt: now } : s
      );
    case "setAudience":
      return state.map((s) =>
        s.id === action.id ? { ...s, audience: action.audience, updatedAt: now } : s
      );
    case "setSimulation":
      return state.map((s) =>
        s.id === action.id
          ? {
              ...s,
              simulation: action.simulation,
              status: "complete",
              updatedAt: now,
            }
          : s
      );
    case "setStatus":
      return state.map((s) =>
        s.id === action.id ? { ...s, status: action.status, updatedAt: now } : s
      );
    default:
      return state;
  }
}

interface AppStateValue {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  studies: Study[];
  getStudy: (id: string) => Study | undefined;
  createDraft: (seed?: Partial<Study>) => Study;
  upsertStudy: (study: Study) => void;
  patchStudy: (id: string, patch: Partial<Study>) => void;
  deleteStudy: (id: string) => void;
  setAudience: (id: string, audience: Audience) => void;
  setSimulation: (id: string, simulation: SimulationResult) => void;
  setStatus: (id: string, status: Study["status"]) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(() => getApiKey());
  const [studies, dispatch] = useReducer(reducer, [] as Study[], () =>
    loadStudies()
  );

  useEffect(() => {
    saveStudies(studies);
  }, [studies]);

  const setApiKey = useCallback((key: string | null) => {
    if (key) {
      persistApiKey(key);
    } else {
      clearApiKey();
    }
    setApiKeyState(key);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      apiKey,
      setApiKey,
      studies,
      getStudy: (id: string) => studies.find((s) => s.id === id),
      createDraft: (seed) => {
        const now = Date.now();
        const study: Study = {
          id: uid("study"),
          title: seed?.title ?? "Untitled study",
          description: seed?.description ?? "",
          goal: seed?.goal,
          questions: seed?.questions ?? [],
          audience: seed?.audience,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "upsert", study });
        return study;
      },
      upsertStudy: (study) => dispatch({ type: "upsert", study }),
      patchStudy: (id, patch) => dispatch({ type: "patch", id, patch }),
      deleteStudy: (id) => dispatch({ type: "delete", id }),
      setAudience: (id, audience) =>
        dispatch({ type: "setAudience", id, audience }),
      setSimulation: (id, simulation) =>
        dispatch({ type: "setSimulation", id, simulation }),
      setStatus: (id, status) => dispatch({ type: "setStatus", id, status }),
    }),
    [apiKey, setApiKey, studies]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
