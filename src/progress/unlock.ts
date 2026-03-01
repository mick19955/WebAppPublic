import type { ProgressState } from "./types";
import { isMastered } from "./mastery";

export type NodeStatus = "locked" | "available" | "mastered";

/**
 * Dev helper: unlock everything.
 *
 * Supports:
 * - build-time flag: VITE_UNLOCK_ALL=1
 * - runtime toggle: localStorage key "dev_unlock_all" = "1"
 * - URL param: ?unlockAll=1 (or true/on)
 */
function devUnlockAllEnabled(): boolean {
  if (!import.meta.env.DEV) return false;

  if (import.meta.env.VITE_UNLOCK_ALL === "1") return true;

  try {
    // Runtime toggle for developers.
    if (localStorage.getItem("dev_unlock_all") === "1") return true;

    // Quick override for testing (no persistence required).
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("unlockAll");
    if (!v) return false;
    return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "on";
  } catch {
    return false;
  }
}

export function statusOf(skillmap: any, progress: ProgressState, nodeId: string): NodeStatus {
  const p = progress.nodes[nodeId];
  if (p && isMastered(p)) return "mastered";

  if (devUnlockAllEnabled()) return "available";

  const node = skillmap?.nodes?.find((n: any) => n.id === nodeId);
  if (!node) return "locked";

  const prereqs: string[] = node.prereqs ?? [];
  const ok = prereqs.every((pid) => {
    const pp = progress.nodes[pid];
    return pp ? isMastered(pp) : false;
  });

  return ok ? "available" : "locked";
}
