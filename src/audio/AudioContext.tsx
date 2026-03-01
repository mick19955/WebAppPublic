import React, { createContext, useContext, useMemo, useState } from "react";
import { AudioManager } from "./AudioManager";

type AudioPrefs = { enabled: boolean; volume: number };

type AudioApi = {
  audio: AudioManager;
  prefs: AudioPrefs;
  setPrefs: (p: Partial<AudioPrefs>) => void;
  prime: () => Promise<void>; // call on first user interaction
};

const Ctx = createContext<AudioApi | null>(null);

function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem("audio:prefs");
    if (!raw) return { enabled: true, volume: 0.7 };
    const x = JSON.parse(raw);
    return { enabled: !!x.enabled, volume: Math.max(0, Math.min(1, Number(x.volume ?? 0.7))) };
  } catch {
    return { enabled: true, volume: 0.7 };
  }
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audio = useMemo(() => new AudioManager(), []);
  const [prefs, setPrefsState] = useState<AudioPrefs>(() => loadPrefs());

  const setPrefs = (p: Partial<AudioPrefs>) => {
    const next = {
      enabled: p.enabled ?? prefs.enabled,
      volume: p.volume ?? prefs.volume,
    };
    setPrefsState(next);
    localStorage.setItem("audio:prefs", JSON.stringify(next));
    audio.setSettings(next);
  };

  // keep manager synced on first render
  useMemo(() => {
    audio.setSettings(prefs);
  }, [audio, prefs]);

  const api: AudioApi = {
    audio,
    prefs,
    setPrefs,
    prime: () => audio.ensureStarted(),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAudio must be used inside AudioProvider");
  return v;
}