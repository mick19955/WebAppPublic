import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { PracticeEvent, ProgressState } from "./types";
import { applyEvent } from "./mastery";
import { clearProgress, loadProgress, saveProgress } from "./storage";

const EMPTY: ProgressState = { nodes: {}, events: [] };

type Ctx = {
  progress: ProgressState;
  addEvent: (e: PracticeEvent) => void;
  resetProgress: () => void;
};

const ProgressContext = createContext<Ctx | null>(null);

type Action =
  | { type: "ADD_EVENT"; event: PracticeEvent }
  | { type: "RESET" }
  | { type: "LOAD"; state: ProgressState };

function reducer(state: ProgressState, action: Action): ProgressState {
  if (action.type === "ADD_EVENT") return applyEvent(state, action.event);
  if (action.type === "RESET") return EMPTY;
  if (action.type === "LOAD") return action.state;
  return state;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, dispatch] = useReducer(reducer, EMPTY);

  useEffect(() => {
    const loaded = loadProgress();
    if (loaded) dispatch({ type: "LOAD", state: loaded });
  }, []);

  useEffect(() => { saveProgress(progress); }, [progress]);

  const value = useMemo<Ctx>(() => ({
    progress,
    addEvent: (e) => dispatch({ type: "ADD_EVENT", event: e }),
    resetProgress: () => { clearProgress(); dispatch({ type: "RESET" }); },
  }), [progress]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
