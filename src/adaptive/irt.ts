// Rasch-style (1PL) adaptive policy for MVP.
// theta: user ability (per node)
// b: item difficulty

export const IRT = {
  // Start low so new users get very easy items.
  initialTheta: -2.2,
  // Learning rate for online updates. Higher => adapts faster but more jitter.
  k: 0.6,
  // Target probability for item selection (higher => easier items).
  targetP: 0.8,
  // Discrete difficulty anchors for levels 1..4.
  levelAnchors: {
    1: -1.5,
    2: -0.5,
    3: 0.5,
    4: 1.5,
  } as const,
} as const;

export function sigmoid(x: number): number {
  // numerically stable enough for our small range
  return 1 / (1 + Math.exp(-x));
}

export function logit(p: number): number {
  const eps = 1e-6;
  const pp = Math.min(1 - eps, Math.max(eps, p));
  return Math.log(pp / (1 - pp));
}

export function levelToB(level: number): number {
  const L = Math.round(level);
  if (L <= 1) return IRT.levelAnchors[1];
  if (L === 2) return IRT.levelAnchors[2];
  if (L === 3) return IRT.levelAnchors[3];
  return IRT.levelAnchors[4];
}

export function bToNearestLevel(b: number): number {
  const candidates = [1, 2, 3, 4];
  let best = 1;
  let bestDist = Infinity;
  for (const L of candidates) {
    const d = Math.abs(b - levelToB(L));
    if (d < bestDist) {
      bestDist = d;
      best = L;
    }
  }
  return best;
}

export function chooseLevelFromTheta(theta: number): number {
  const bTarget = theta - logit(IRT.targetP);
  return bToNearestLevel(bTarget);
}

export function thetaToMastery(theta: number): number {
  // mastery in [0..1]
  return sigmoid(theta);
}

export function updateTheta(theta: number, b: number, y: number, k = IRT.k): number {
  const p = sigmoid(theta - b);
  return theta + k * (y - p);
}

export function estimateItemBFromLevel(itemLevel?: number): number {
  if (typeof itemLevel === "number" && Number.isFinite(itemLevel)) return levelToB(itemLevel);
  return 0;
}
