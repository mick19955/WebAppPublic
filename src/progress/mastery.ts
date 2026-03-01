import type { NodeProgress, PracticeEvent, ProgressState } from "./types";
import { IRT, estimateItemBFromLevel, sigmoid, updateTheta, levelToB } from "../adaptive/irt";

export function clamp01(x: number) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function isMastered(p: NodeProgress) {
  return p.mastery >= 0.85;
}

function eventToY(e: PracticeEvent): number {
  if (e.outcome === "correct") return 1;
  // skipped counts as lack of understanding (y=0)
  return 0;
}

function bRefFromEvent(e: PracticeEvent, fallback: number): number {
  if (typeof e.node_b === "number" && Number.isFinite(e.node_b)) return e.node_b;
  if (typeof e.node_level === "number" && Number.isFinite(e.node_level)) return levelToB(e.node_level);
  return fallback;
}

export function applyEvent(prev: ProgressState, e: PracticeEvent): ProgressState {
  const nodes = { ...prev.nodes };

  const old: NodeProgress = nodes[e.node_id] ?? {
    theta: IRT.initialTheta,
    node_b: 0,
    mastery: clamp01(sigmoid(IRT.initialTheta - 0)),
    attempts: 0,
    correct: 0,
  };

  const y = eventToY(e);

  const bItem =
    (typeof e.item_b === "number" && Number.isFinite(e.item_b))
      ? e.item_b
      : estimateItemBFromLevel(e.item_level);

  const bRef = bRefFromEvent(e, old.node_b || bItem);

  const theta = updateTheta(old.theta, bItem, y);
  const mastery = clamp01(sigmoid(theta - bRef));

  const attempts = old.attempts + 1;
  const correct = old.correct + (e.outcome === "correct" ? 1 : 0);

  nodes[e.node_id] = {
    theta,
    node_b: bRef,
    mastery,
    attempts,
    correct,
    last_ts: e.timestamp,
  };

  return { nodes, events: [e, ...prev.events].slice(0, 500) };
}
