import type { ProgressState, NodeProgress, PracticeEvent } from "./types";
import { IRT, logit, sigmoid } from "../adaptive/irt";

const KEY_V2 = "skillapp.progress.v2";
const KEY_V1 = "skillapp.progress.v1";
const SCHEMA_VERSION = 2;

type StoredV2 = {
  schemaVersion: number;
  nodes: Record<string, any>;
  events: any[];
};

function asFiniteNumber(x: any): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const s = x.trim().replace(",", ".");
    if (!s) return undefined;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function clamp01(x: number) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function normalizeNodeProgress(np: any): NodeProgress {
  const node_b = asFiniteNumber(np?.node_b) ?? 0;

  const masteryIn = asFiniteNumber(np?.mastery);
  const thetaIn = asFiniteNumber(np?.theta);

  // If theta missing, infer from mastery (assuming mastery = sigmoid(theta - node_b))
  const theta =
    thetaIn ??
    (typeof masteryIn === "number"
      ? logit(clamp01(Math.min(0.999, Math.max(0.001, masteryIn)))) + node_b
      : IRT.initialTheta);

  const mastery = clamp01(sigmoid(theta - node_b));

  const attempts = Math.max(0, Math.floor(asFiniteNumber(np?.attempts) ?? 0));
  const correct = Math.max(0, Math.floor(asFiniteNumber(np?.correct) ?? 0));

  const last_ts = typeof np?.last_ts === "string" ? np.last_ts : undefined;

  return { mastery, theta, node_b, attempts, correct, last_ts };
}

function normalizeEvent(e: any): PracticeEvent {
  const out: PracticeEvent = {
    event_id: typeof e?.event_id === "string" ? e.event_id : crypto.randomUUID(),
    timestamp: typeof e?.timestamp === "string" ? e.timestamp : new Date().toISOString(),
    node_id: String(e?.node_id ?? ""),
    blueprint_id: String(e?.blueprint_id ?? ""),
    item_id: String(e?.item_id ?? ""),
    outcome: (e?.outcome === "correct" || e?.outcome === "incorrect" || e?.outcome === "skipped") ? e.outcome : "incorrect",
  };

  if (typeof e?.error_code === "string") out.error_code = e.error_code;

  const node_level = asFiniteNumber(e?.node_level);
  if (node_level !== undefined) out.node_level = node_level;

  const node_b = asFiniteNumber(e?.node_b);
  if (node_b !== undefined) out.node_b = node_b;

  const item_level = asFiniteNumber(e?.item_level);
  if (item_level !== undefined) out.item_level = item_level;

  const item_b = asFiniteNumber(e?.item_b);
  if (item_b !== undefined) out.item_b = item_b;

  return out;
}

function normalizeState(raw: any): ProgressState {
  const nodesAny = (raw && typeof raw === "object" && raw.nodes && typeof raw.nodes === "object") ? raw.nodes : {};
  const eventsAny = (raw && typeof raw === "object" && Array.isArray(raw.events)) ? raw.events : [];

  const nodes: Record<string, NodeProgress> = {};
  for (const k of Object.keys(nodesAny)) {
    nodes[k] = normalizeNodeProgress(nodesAny[k]);
  }

  const events: PracticeEvent[] = eventsAny.map(normalizeEvent);
  return { nodes, events };
}

export function loadProgress(): ProgressState | null {
  try {
    const rawV2 = localStorage.getItem(KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as StoredV2;
      return normalizeState(parsed);
    }

    const rawV1 = localStorage.getItem(KEY_V1);
    if (!rawV1) return null;

    const parsedV1 = JSON.parse(rawV1);
    const migrated = normalizeState(parsedV1);

    // write back as v2
    try {
      const stored: StoredV2 = { schemaVersion: SCHEMA_VERSION, nodes: migrated.nodes as any, events: migrated.events as any };
      localStorage.setItem(KEY_V2, JSON.stringify(stored));
      localStorage.removeItem(KEY_V1);
    } catch {}

    return migrated;
  } catch {
    return null;
  }
}

export function saveProgress(p: ProgressState) {
  try {
    const stored: StoredV2 = { schemaVersion: SCHEMA_VERSION, nodes: p.nodes as any, events: p.events as any };
    localStorage.setItem(KEY_V2, JSON.stringify(stored));
  } catch {}
}

export function clearProgress() {
  try { localStorage.removeItem(KEY_V2); } catch {}
  try { localStorage.removeItem(KEY_V1); } catch {}
}
