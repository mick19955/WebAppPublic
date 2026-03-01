// Engine v0.2 (browser-friendly) — multiple skills, integer answers + division with remainder.
// NOTE: Security is not a goal in this MVP (correct answers live client-side).

export type BlueprintId = string;

export type DifficultyLevel = number;

export type Display =
  | { kind: "fraction"; num: number; den: number }
  | { kind: "text"; text: string };

export type CommonItem = {
  item_id: string;
  blueprint_id: BlueprintId;
  node_id: string;
  created_at: string;
  difficulty_level: DifficultyLevel;
  domain: string;
  seed: number;
  display: Display;
  meta?: any;
};

export type ItemInt = CommonItem & {
  response_kind: "int";
  correct_answer: number;
};

export type ItemQR = CommonItem & {
  response_kind: "quotient_remainder";
  divisor: number;
  correct_quotient: number;
  correct_remainder: number;
};

export type ItemNumber = CommonItem & {
  response_kind: "number";
  scale: number;
  correct_scaled: number;
};

export type ItemMCQ = CommonItem & {
  response_kind: "mcq";
  choices: string[];
  correct_choice_index: number;
};

export type ItemOrder = CommonItem & {
  response_kind: "order";
  /** Visible values (rendered as strings; may contain comma for decimals). */
  values: string[];
  /** Correct order as indices into `values` (ascending). */
  correct_order: number[];
};


export type ColumnAddWork = {
  /** Digits in the result row, left-to-right, length = n + 1 (includes possible leading carry digit). */
  result_digits: (number | null)[];
  /** Carry-in shown above each column digit of the addends, left-to-right, length = n. (Rightmost should be 0.) */
  carry_in: (number | null)[];
};

export type ItemColumnAdd = CommonItem & {
  response_kind: "column_add";
  /** Number of columns (digits) in the addends (no leading sign). */
  n: number;
  /** Addends (non-negative integers). */
  a: number;
  b: number;
  /** Correct full sum (for summary/skip). */
  correct_answer: number;
  /** Structured ground-truth for digit/carry evaluation (left-to-right). */
  meta: {
    kind: "column_add";
    a_digits: number[]; // length n
    b_digits: number[]; // length n
    carry_in: number[]; // length n
    result_digits: number[]; // length n+1 (leading digit may be 0)
  };
};

export type ItemInstance = ItemInt | ItemQR | ItemNumber | ItemMCQ | ItemOrder | ItemColumnAdd;

export type Feedback = {
  severity: "info" | "error" | "success";
  message_key: string;
  hint_key?: string;
  message_params?: Record<string, any>;
};

export type EvidenceEvent = {
  item_id: string;
  blueprint_id: BlueprintId;
  node_id: string;
  timestamp: string;
  outcome: "correct" | "incorrect";
  error_code?: string;
  primary_micro_skills: string[];
  secondary_micro_skills: string[];
  micro_skill_deltas: Record<string, number>;
  attempts: number;
  hints_used: number;
  time_ms: number;
};

export type CheckResult = {
  item_id: string;
  blueprint_id: BlueprintId;
  node_id: string;
  outcome: "correct" | "incorrect";
  primary_error_code?: string;
  failed_step_id?: string;
  feedback: Feedback;
  evidence_event: EvidenceEvent;
};

export type RunnerState =
  | { status: "idle"; blueprint_id: BlueprintId; difficulty_level: DifficultyLevel; seed: number; counter: number }
  | { status: "presenting"; blueprint_id: BlueprintId; difficulty_level: DifficultyLevel; seed: number; counter: number; item: ItemInstance }
  | { status: "feedback"; blueprint_id: BlueprintId; difficulty_level: DifficultyLevel; seed: number; counter: number; item: ItemInstance; last_result: CheckResult };

export type RunnerAction =
  | { type: "NEW_ITEM"; difficulty_level?: DifficultyLevel }
  | { type: "NEXT" }
  | { type: "SUBMIT"; raw_response: any };

export function isoNow() {
  return new Date().toISOString();
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


type Rng = () => number;

// RNG helpers (aliases used in some generator blocks)
function mkRng(seed: number): Rng {
  return mulberry32((seed >>> 0) || 1);
}
function makeRng(seed: number): Rng {
  return mkRng(seed);
}
function flip(rng: Rng): boolean {
  return rng() < 0.5;
}

function randInt(rng: () => number, lo: number, hi: number) {
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function pick<T>(rng: () => number, xs: T[]): T {
  return xs[randInt(rng, 0, xs.length - 1)]!;
}

// Alias used by some generators (readability).
function randChoice<T>(rng: () => number, xs: T[]): T {
  return xs[randInt(rng, 0, xs.length - 1)]!;
}


// Legacy alias used by some generator blocks.
function choice<T>(rng: () => number, xs: T[]): T {
  return randChoice(rng, xs);
}

function idFrom(seed: number, counter: number) {
  const s = `${seed}_${counter}_${Math.floor(seed * 2654435761)}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `itm_${seed}_${(h >>> 0).toString(16).slice(0, 7)}`;
}


type MakeItemArgs<T extends CommonItem> = Omit<T, "item_id" | "created_at" | "seed" | "domain"> & {
  seed0: number;
  counter: number;
  seed?: number;
  domain?: string;
  // legacy alias used in some older generator blocks
  domain_id?: string;
};

function makeCommonItem<T extends CommonItem>(args: MakeItemArgs<T>): T {
  const { seed0, counter, seed, domain, domain_id, ...rest } = args as any;
  return {
    item_id: idFrom(seed0, counter),
    created_at: isoNow(),
    seed: Number.isFinite(seed) ? (seed as number) : seed0 + counter,
    domain: (domain ?? domain_id ?? "misc") as string,
    ...rest,
  } as T;
}

function makeIntItem(args: MakeItemArgs<ItemInt>): ItemInt {
  return makeCommonItem<ItemInt>(args);
}

function makeQRItem(args: MakeItemArgs<ItemQR>): ItemQR {
  return makeCommonItem<ItemQR>(args);
}

function makeNumberItem(args: MakeItemArgs<ItemNumber>): ItemNumber {
  return makeCommonItem<ItemNumber>(args);
}

function makeMCQItem(args: MakeItemArgs<ItemMCQ>): ItemMCQ {
  return makeCommonItem<ItemMCQ>(args);
}

function makeOrderItem(args: MakeItemArgs<ItemOrder>): ItemOrder {
  return makeCommonItem<ItemOrder>(args);
}


function levelRange(level: number, small: [number, number], medium: [number, number], large: [number, number], xl: [number, number]) {
  if (level <= 1) return small;
  if (level === 2) return medium;
  if (level === 3) return large;
  return xl;
}

function genAdd(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  // Level 1 should be "0. klasse"-venligt: primært en-cifrede tal.
  const [lo, hi] = levelRange(level, [0, 9], [10, 99], [100, 999], [1000, 9999]);
  const a = randInt(rng, lo, hi);
  const b = randInt(rng, lo, hi);
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "N1.4-ADD",
    node_id: "N1.4.1",
    difficulty_level: level,
    domain: "N1.4",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} + ${b}` },
    response_kind: "int",
    correct_answer: a + b,
  });
}

type AddGenOut = { text: string; answer: number };

function addText(terms: number[]): string {
  if (terms.length === 2) return `${terms[0]} + ${terms[1]}`;
  return terms.map((n) => String(n)).join(" + ");
}

function genUntil<T>(rng: () => number, maxTries: number, f: () => T, ok: (x: T) => boolean): T {
  let last = f();
  for (let i = 0; i < maxTries; i++) {
    const x = f();
    last = x;
    if (ok(x)) return x;
  }
  return last;
}

function isValidCompensationFromText(displayText: string, x: number, y: number): boolean {
  // Expect display like '79 + 27'
  const m = displayText.match(/(-?\d+)\s*\+\s*(-?\d+)/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

  // Must show a compensation step: at least one term is a multiple of 10
  if (x % 10 !== 0 && y % 10 !== 0) return false;

  // Check if (x,y) can be obtained by transferring k between addends: (a+k, b-k) or (a-k, b+k)
  const pairs: Array<[number, number]> = [[a, b], [b, a]];
  for (const [p, q] of pairs) {
    // x is adjusted from p
    const k1 = x - p;
    if (k1 !== 0 && Number.isInteger(k1) && y === q - k1) return true;
    // y is adjusted from p
    const k2 = y - p;
    if (k2 !== 0 && Number.isInteger(k2) && x === q - k2) return true;
  }
  return false;
}

function genTwoDigit(rng: () => number): number {
  return randInt(rng, 10, 99);
}

function genNdigit(rng: () => number, digits: number): number {
  const lo = Math.pow(10, digits - 1);
  const hi = Math.pow(10, digits) - 1;
  return randInt(rng, lo, hi);
}

function genByCarryPattern(rng: () => number, cols: number, carryPattern: number[]): { a: number; b: number } {
  // carryPattern[i] = carry OUT of column i (to i+1). length==cols.
  const aDigits: number[] = [];
  const bDigits: number[] = [];
  let carryIn = 0;

  for (let col = 0; col < cols; col++) {
    const wantCarryOut = carryPattern[col] ?? 0;
    const minA = col === cols - 1 ? 1 : 0; // leading digit non-zero
    const minB = col === cols - 1 ? 1 : 0;

    const pick = genUntil(
      rng,
      5000,
      () => {
        const a = randInt(rng, minA, 9);
        const b = randInt(rng, minB, 9);
        const s = a + b + carryIn;
        const carryOut = s >= 10 ? 1 : 0;
        return { a, b, carryOut };
      },
      (x) => x.carryOut === wantCarryOut
    );

    aDigits.push(pick.a);
    bDigits.push(pick.b);
    carryIn = wantCarryOut;
  }

  const a = aDigits.reduce((acc, d, i) => acc + d * Math.pow(10, i), 0);
  const b = bDigits.reduce((acc, d, i) => acc + d * Math.pow(10, i), 0);
  return { a, b };
}

const ADD_BP: Record<string, { node_id: string; level: DifficultyLevel; gen: (rng: () => number) => AddGenOut }> = {
  "A0-COUNT_ALL": {
    node_id: "A0.1",
    level: 1,
    gen: (rng) => {
      const a = randInt(rng, 0, 5);
      const b = randInt(rng, 0, 5);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A0-COUNT_ON": {
    node_id: "A0.2",
    level: 1,
    gen: (rng) => {
      const a = randInt(rng, 0, 9);
      const b = randInt(rng, 0, 9);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A0-BONDS_10": {
    node_id: "A0.3",
    level: 1,
    gen: (rng) => {
      // Find the missing number to make 10 (avoid trivial 0/10 cases)
      const known = randInt(rng, 1, 9);
      const missing = 10 - known;
      const left = rng() < 0.5;
      const text = left ? `□ + ${known} = 10` : `${known} + □ = 10`;
      return { text, answer: missing };
    },
  },
  "A0-DOUBLES": {
    node_id: "A0.4",
    level: 1,
    gen: (rng) => {
      const a = randInt(rng, 0, 10);
      return { text: `${a} + ${a}`, answer: a + a };
    },
  },
  "A0-NEAR_DOUBLES": {
    node_id: "A0.5",
    level: 2,
    gen: (rng) => {
      const a = randInt(rng, 1, 9);
      const b = a + randChoice(rng, [-1, 1]);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A1-1D-SUM_LE_10": {
    node_id: "A1.1",
    level: 1,
    gen: (rng) => {
      // Mostly avoid +0; allow 0 rarely.
      const pair = genUntil(
        rng,
        5000,
        () => {
          const a = rng() < 0.1 ? 0 : randInt(rng, 1, 9);
          const b = rng() < 0.1 ? 0 : randInt(rng, 1, 9);
          return { a, b, s: a + b };
        },
        ({ a, b, s }) => s <= 10 && !(a === 0 && b === 0)
      );
      return { text: `${pair.a} + ${pair.b}`, answer: pair.s };
    },
  },
  "A1-1D-SUM_11_18": {
    node_id: "A1.2",
    level: 1,
    gen: (rng) => {
      const pair = genUntil(
        rng,
        5000,
        () => {
          const a = randInt(rng, 2, 9);
          const b = randInt(rng, 2, 9);
          return { a, b, s: a + b };
        },
        (x) => x.s >= 11 && x.s <= 18
      );
      return { text: `${pair.a} + ${pair.b}`, answer: pair.s };
    },
  },
  "A1-MAKE_TEN_8_9": {
    node_id: "A1.3",
    level: 1,
    gen: (rng) => {
      const a = randChoice(rng, [8, 9]);
      const minB = a === 8 ? 2 : 1;
      const b = randInt(rng, minB, 9);
      const flip = rng() < 0.5;
      const x = flip ? b : a;
      const y = flip ? a : b;
      return { text: `${x} + ${y}`, answer: a + b };
    },
  },

  "A1-3TERMS_LE_10": {
    node_id: "A1.4",
    level: 1,
    gen: (rng) => {
      const t = genUntil(
        rng,
        8000,
        () => {
          const a = randInt(rng, 0, 9);
          const b = randInt(rng, 0, 9);
          const c = randInt(rng, 0, 9);
          return { terms: [a, b, c], s: a + b + c };
        },
        (x) => x.s <= 10
      );
      return { text: addText(t.terms), answer: t.s };
    },
  },
  "A1-3TERMS_11_18": {
    node_id: "A1.5",
    level: 1,
    gen: (rng) => {
      const t = genUntil(
        rng,
        8000,
        () => {
          const a = randInt(rng, 0, 9);
          const b = randInt(rng, 0, 9);
          const c = randInt(rng, 0, 9);
          return { terms: [a, b, c], s: a + b + c };
        },
        (x) => x.s >= 11 && x.s <= 18
      );
      return { text: addText(t.terms), answer: t.s };
    },
  },

  // A2.1.* (tierre-strategier) er opdelt i fire mikrotrin.
  "A2-TENS_TENS_LE_100": {
    node_id: "A2.1.1",
    level: 2,
    gen: (rng) => {
      const aT = randInt(rng, 1, 9);
      const bT = randInt(rng, 1, 10 - aT);
      const a = aT * 10;
      const b = bT * 10;
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A2-TENS_TENS_GT_100": {
    node_id: "A2.1.2",
    level: 2,
    gen: (rng) => {
      const pair = genUntil(
        rng,
        4000,
        () => {
          const aT = randInt(rng, 1, 9);
          const bT = randInt(rng, 1, 9);
          return { aT, bT };
        },
        (x) => (x.aT + x.bT) >= 11
      );
      const a = pair.aT * 10;
      const b = pair.bT * 10;
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A2-TENS_PLUS_MIX_LE_100": {
    node_id: "A2.1.3",
    level: 2,
    gen: (rng) => {
      const tensOnly = randInt(rng, 1, 9) * 10;
      const other = genUntil(
        rng,
        5000,
        () => randInt(rng, 1, 99),
        (x) => (x % 10) !== 0
      );
      const pair = genUntil(
        rng,
        2000,
        () => {
          const flip = rng() < 0.5;
          const a = flip ? other : tensOnly;
          const b = flip ? tensOnly : other;
          return { a, b, s: a + b };
        },
        (x) => x.s <= 100
      );
      return { text: `${pair.a} + ${pair.b}`, answer: pair.s };
    },
  },"A2-TENS_MIX_LE_100": {
    node_id: "A2.1.3",
    level: 2,
    gen: (rng) => {
      const tensOnly = randInt(rng, 1, 9) * 10;
      const other = genUntil(
        rng,
        5000,
        () => randInt(rng, 1, 99),
        (x) => (x % 10) !== 0
      );
      const pair = genUntil(
        rng,
        2000,
        () => {
          const flip = rng() < 0.5;
          const a = flip ? other : tensOnly;
          const b = flip ? tensOnly : other;
          return { a, b, s: a + b };
        },
        (x) => x.s <= 100
      );
      return { text: `${pair.a} + ${pair.b}`, answer: pair.s };
    },
  },
  "A2-TENS_PLUS_MIX_GT_100": {
    node_id: "A2.1.4",
    level: 2,
    gen: (rng) => {
      const tensOnly = randInt(rng, 1, 9) * 10;
      const other = genUntil(
        rng,
        5000,
        () => randInt(rng, 1, 99),
        (x) => (x % 10) !== 0
      );
      const pair = genUntil(
        rng,
        2000,
        () => {
          const flip = rng() < 0.5;
          const a = flip ? other : tensOnly;
          const b = flip ? tensOnly : other;
          return { a, b, s: a + b };
        },
        (x) => x.s > 100
      );
      return { text: `${pair.a} + ${pair.b}`, answer: pair.s };
    },
  },
"A2-TENS_MIX_GT_100": {
    node_id: "A2.1.4",
    level: 2,
    gen: (rng) => {
      const tensOnly = randInt(rng, 1, 9) * 10;
      const other = genUntil(
        rng,
        5000,
        () => randInt(rng, 1, 99),
        (x) => (x % 10) !== 0
      );
      const pair = genUntil(
        rng,
        2000,
        () => {
          const flip = rng() < 0.5;
          const a = flip ? other : tensOnly;
          const b = flip ? tensOnly : other;
          return { a, b, s: a + b };
        },
        (x) => x.s > 100
      );
      return { text: `${pair.a} + ${pair.b}`, answer: pair.s };
    },
  },

  "A2-2D1D-NOCARRY": {
    node_id: "A2.2",
    level: 2,
    gen: (rng) => {
      // Ingen +0 i denne node, og ingen "mente" i enerne.
      const a = genUntil(rng, 5000, () => genTwoDigit(rng), (x) => (x % 10) <= 8);
      const ones = a % 10;
      const b = randInt(rng, 1, 9 - ones);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A2-2D1D-CARRY": {
    node_id: "A2.3",
    level: 2,
    gen: (rng) => {
      const a = genTwoDigit(rng);
      const ones = a % 10;
      const b = randInt(rng, Math.max(1, 10 - ones), 9);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A2-2D2D-NOCARRY": {
    node_id: "A2.4",
    level: 2,
    gen: (rng) => {
      const aT = randInt(rng, 1, 9);
      const bT = randInt(rng, 1, 9 - aT);
      const aO = randInt(rng, 0, 9);
      const bO = randInt(rng, 0, 9 - aO);
      const a = aT * 10 + aO;
      const b = bT * 10 + bO;
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A2-2D2D-CARRY1": {
    node_id: "A2.5",
    level: 2,
    gen: (rng) => {
      const aO = randInt(rng, 0, 9);
      const bO = randInt(rng, Math.max(0, 10 - aO), 9);
      const aT = randInt(rng, 1, 8);
      const bT = randInt(rng, 1, 8 - aT); // +1 carry stays <10
      const a = aT * 10 + aO;
      const b = bT * 10 + bO;
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A2-2D2D-CARRY2": {
    node_id: "A2.6",
    level: 2,
    gen: (rng) => {
      const aO = randInt(rng, 0, 9);
      const bO = randInt(rng, Math.max(0, 10 - aO), 9);
      const aT = randInt(rng, 1, 9);
      const bT = randInt(rng, Math.max(1, 9 - aT), 9); // +1 carry makes >=10
      const a = aT * 10 + aO;
      const b = bT * 10 + bO;
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },

  // A3.* uses same number families as A2.*, but presented as "skriftlig" practice.
  "A3-COL2D-NOCARRY": { node_id: "A3.1", level: 2, gen: (rng) => ADD_BP["A2-2D2D-NOCARRY"]!.gen(rng) },
  "A3-COL2D-CARRY1": { node_id: "A3.2", level: 2, gen: (rng) => ADD_BP["A2-2D2D-CARRY1"]!.gen(rng) },
  "A3-COL2D-CARRY2": { node_id: "A3.3", level: 2, gen: (rng) => ADD_BP["A2-2D2D-CARRY2"]!.gen(rng) },
  "A3-COMPENSATION": {
    node_id: "A3.4",
    level: 2,
    gen: (rng) => {
      // Mental kompensation: ét tal slutter på 8 eller 9.
      // Hvis 9 -> kompensation k=1 (andet tal skal have ener >=1)
      // Hvis 8 -> kompensation k=2 (andet tal skal have ener >=2)
      const k = randChoice(rng, [1, 2]);
      const ones = 10 - k; // 9 eller 8

      const specialT = randInt(rng, 1, 9);
      const special = specialT * 10 + ones;

      const other = genUntil(
        rng,
        8000,
        () => genTwoDigit(rng),
        (x) => (x % 10) >= k
      );

      const flip = rng() < 0.5;
      const a = flip ? special : other;
      const b = flip ? other : special;

      return { text: `${a} + ${b}`, answer: a + b };
    },
  },

  "A4-3D3D-NOCARRY": {
    node_id: "A4.1",
    level: 3,
    gen: (rng) => {
      const { a, b } = genByCarryPattern(rng, 3, [0, 0, 0]);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A4-3D3D-CARRY1": {
    node_id: "A4.2",
    level: 3,
    gen: (rng) => {
      // exactly one carry among ones/tens/hundreds
      const idx = randChoice(rng, [0, 1, 2]);
      const pattern = [0, 0, 0];
      pattern[idx] = 1;
      const { a, b } = genByCarryPattern(rng, 3, pattern);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A4-3D3D-MULTICARRY": {
    node_id: "A4.3",
    level: 3,
    gen: (rng) => {
      const pattern = genUntil(
        rng,
        2000,
        () => [randChoice(rng, [0, 1]), randChoice(rng, [0, 1]), randChoice(rng, [0, 1])],
        (p) => (p[0] + p[1] + p[2]) >= 2
      );
      const { a, b } = genByCarryPattern(rng, 3, pattern);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A4-CHAIN_CARRY": {
    node_id: "A4.4",
    level: 3,
    gen: (rng) => {
      const n = randInt(rng, 3, 6);
      const trailing9s = randInt(rng, 2, n - 1);
      const prefix = randInt(rng, 1, 8);
      const a = prefix * Math.pow(10, trailing9s) + (Math.pow(10, trailing9s) - 1);
      const b = randInt(rng, 1, 9);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A4-MULTIADD-3": {
    node_id: "A4.5",
    level: 3,
    gen: (rng) => {
      const a = randInt(rng, 10, 999);
      const b = randInt(rng, 10, 999);
      const c = randInt(rng, 10, 999);
      const terms = [a, b, c];
      return { text: addText(terms), answer: a + b + c };
    },
  },

  "A5-4D4D-NOCARRY": {
    node_id: "A5.1",
    level: 3,
    gen: (rng) => {
      const { a, b } = genByCarryPattern(rng, 4, [0, 0, 0, 0]);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A5-4D4D-CARRY": {
    node_id: "A5.2",
    level: 3,
    gen: (rng) => {
      const pattern = genUntil(
        rng,
        4000,
        () => [randChoice(rng, [0, 1]), randChoice(rng, [0, 1]), randChoice(rng, [0, 1]), randChoice(rng, [0, 1])],
        (p) => (p[0] + p[1] + p[2] + p[3]) >= 1
      );
      const { a, b } = genByCarryPattern(rng, 4, pattern);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A5-5_6_DIGIT": {
    node_id: "A5.3",
    level: 3,
    gen: (rng) => {
      const a = genNdigit(rng, randChoice(rng, [5, 6]));
      const b = genNdigit(rng, randChoice(rng, [5, 6]));
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A5-ZEROS_PLACEVALUE": {
    node_id: "A5.4",
    level: 3,
    gen: (rng) => {
      const a = genNdigit(rng, randChoice(rng, [4, 5, 6]));
      const bBase = genNdigit(rng, randChoice(rng, [2, 3, 4]));
      // turn b into something with zeros: multiply by 10/100/1000
      const scale = Math.pow(10, randChoice(rng, [1, 2, 3]));
      const b = bBase * scale;
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },

  "A6-7_8_DIGIT": {
    node_id: "A6.1",
    level: 4,
    gen: (rng) => {
      const a = genNdigit(rng, randChoice(rng, [7, 8]));
      const b = genNdigit(rng, randChoice(rng, [7, 8]));
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A6-9_DIGIT": {
    node_id: "A6.2",
    level: 4,
    gen: (rng) => {
      const a = genNdigit(rng, 9);
      const b = genNdigit(rng, 9);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },

  "A7-MIXED-2": {
    node_id: "A7.1",
    level: 4,
    gen: (rng) => {
      const da = randInt(rng, 1, 9);
      const db = randInt(rng, 1, 9);
      const a = genNdigit(rng, da);
      const b = genNdigit(rng, db);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A7-MIXED-MULTI": {
    node_id: "A7.2",
    level: 4,
    gen: (rng) => {
      const n = randInt(rng, 3, 6);
      const terms = Array.from({ length: n }, () => genNdigit(rng, randInt(rng, 1, 9)));
      const s = terms.reduce((acc, x) => acc + x, 0);
      return { text: addText(terms), answer: s };
    },
  },

  "A8-NEG-2": {
    node_id: "A8.1",
    level: 4,
    gen: (rng) => {
      const a = randInt(rng, -200, 200);
      const b = randInt(rng, -200, 200);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  "A8-NEG-3": {
    node_id: "A8.2",
    level: 4,
    gen: (rng) => {
      const a = randInt(rng, -200, 200);
      const b = randInt(rng, -200, 200);
      const c = randInt(rng, -200, 200);
      const terms = [a, b, c];
      const s = a + b + c;
      return { text: addText(terms), answer: s };
    },
  },

  "A9-PARENS": {
    node_id: "A9.1",
    level: 4,
    gen: (rng) => {
      const a = randInt(rng, 0, 200);
      const b = randInt(rng, 0, 200);
      const c = randInt(rng, 0, 200);
      return { text: `${a} + (${b} + ${c})`, answer: a + b + c };
    },
  },
  "A9-CANCEL": {
    node_id: "A9.2",
    level: 4,
    gen: (rng) => {
      const a = randInt(rng, 1, 200);
      const b = -a;
      const c = randInt(rng, -50, 50);
      return { text: `${a} + (${b} + ${c})`, answer: a + b + c };
    },
  },

  "A10-MIXED-PARENS-NEG": {
    node_id: "A10.1",
    level: 4,
    gen: (rng) => {
      const a = randInt(rng, -500, 500);
      const b = randInt(rng, -500, 500);
      const c = randInt(rng, -500, 500);
      return { text: `${a} + (${b} + ${c})`, answer: a + b + c };
    },
  },
  "A10-CHALLENGE": {
    node_id: "A10.2",
    level: 4,
    gen: (rng) => {
      const n = randInt(rng, 4, 6);
      const terms = Array.from({ length: n }, () => randInt(rng, -500, 500));
      const s = terms.reduce((acc, x) => acc + x, 0);
      // Put one parenthesis group around middle two terms.
      const i = randInt(rng, 1, n - 2);
      const parts = terms.map((x) => String(x));
      parts[i] = `(${parts[i]} + ${parts[i + 1]})`;
      parts.splice(i + 1, 1);
      return { text: parts.join(" + "), answer: s };
    },
  },
};

function genAddProgress(seed0: number, counter: number, blueprint_id: string): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const spec = ADD_BP[blueprint_id];
  if (!spec) {
    // fallback: keep legacy generator
    return genAdd(seed0, counter, 1);
  }
  const out = spec.gen(rng);
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint_id as any,
    node_id: spec.node_id,
    difficulty_level: spec.level,
    domain: "A",
    seed: seed0 + counter,
    display: { kind: "text", text: out.text },
    response_kind: "int",
    correct_answer: out.answer,
  });
}


function genSub(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  // Level 1: en-cifrede tal.
  const [lo, hi] = levelRange(level, [0, 9], [10, 99], [100, 999], [1000, 9999]);

  // create a>=b. Prefer borrow at level>=2 sometimes.
  let a = randInt(rng, lo, hi);
  let b = randInt(rng, lo, hi);
  if (level >= 2 && rng() < 0.7) {
    // force borrow in ones (when at least 2 digits)
    const max = Math.max(20, hi);
    a = randInt(rng, Math.max(10, lo), Math.max(10, Math.floor(max * 0.9)));
    b = randInt(rng, 1, Math.min(hi, a));
    const a1 = a % 10;
    const b1 = b % 10;
    if (a1 >= b1) {
      // tweak b's ones digit to be larger than a's
      const newOnes = randInt(rng, a1 + 1, 9);
      b = b - b1 + newOnes;
      if (b > a) {
        // ensure not exceeding
        b = a - 1;
      }
    }
  }
  if (a < b) [a, b] = [b, a];

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "N1.5-SUB",
    node_id: "N1.5.1",
    difficulty_level: level,
    domain: "N1.5",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} − ${b}` },
    response_kind: "int",
    correct_answer: a - b,
  });
}

function genMul(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  let a = 0, b = 0;
  if (level <= 1) {
    a = randInt(rng, 0, 12);
    b = randInt(rng, 0, 12);
  } else if (level === 2) {
    a = randInt(rng, 10, 99);
    b = randInt(rng, 2, 12);
  } else if (level === 3) {
    a = randInt(rng, 10, 99);
    b = randInt(rng, 10, 99);
  } else {
    a = randInt(rng, 100, 999);
    b = randInt(rng, 10, 99);
  }

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "N1.7-MUL",
    node_id: "N1.7.1",
    difficulty_level: level,
    domain: "N1.7",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} × ${b}` },
    response_kind: "int",
    correct_answer: a * b,
  });
}

function genDivNoRem(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  const qMin = level <= 1 ? 10 : level === 2 ? 20 : level === 3 ? 50 : 100;
  const qMax = level <= 1 ? 99 : level === 2 ? 999 : level === 3 ? 1999 : 9999;

  const divisor = randInt(rng, 2, Math.min(12, 4 + level * 2));
  const quotient = randInt(rng, qMin, qMax);
  const dividend = divisor * quotient;

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "N1.18",
    seed: seed0 + counter,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "int",
    correct_answer: quotient,
  });
}

function genDivRem(seed0: number, counter: number, level: number): ItemQR {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  const qMin = level <= 1 ? 5 : level === 2 ? 10 : level === 3 ? 20 : 50;
  const qMax = level <= 1 ? 50 : level === 2 ? 200 : level === 3 ? 999 : 1999;

  const divisor = randInt(rng, 2, Math.min(12, 4 + level * 2));
  const quotient = randInt(rng, qMin, qMax);
  const remainder = randInt(rng, 1, divisor - 1);
  const dividend = divisor * quotient + remainder;

  return makeQRItem({
    seed0,
    counter,
    blueprint_id: "N1.18-DIV-REM",
    node_id: "N1.18.2",
    difficulty_level: level,
    domain: "N1.18",
    seed: seed0 + counter,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "quotient_remainder",
    divisor,
    correct_quotient: quotient,
    correct_remainder: remainder,
  });
}

function genNegAddSub(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  const [lo, hi] = levelRange(level, [-20, 20], [-50, 50], [-200, 200], [-999, 999]);
  const a = randInt(rng, lo, hi);
  const b = randInt(rng, lo, hi);
  const op = pick(rng, ["+", "−"] as const);

  const expr = `${a} ${op} ${b}`;
  const ans = op === "+" ? a + b : a - b;

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "Z2-ADD-SUB",
    node_id: "Z2.1",
    difficulty_level: level,
    domain: "Z2",
    seed: seed0 + counter,
    display: { kind: "text", text: expr },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genNegMulDiv(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  const op = pick(rng, ["×", "÷"] as const);

  if (op === "×") {
    const [lo, hi] = levelRange(level, [-12, 12], [-50, 50], [-200, 200], [-999, 999]);
    const a = randInt(rng, lo, hi);
    const b = randInt(rng, lo, hi);
    return makeIntItem({
      seed0,
      counter,
      blueprint_id: "Z2-MUL-DIV",
      node_id: "Z2.2",
      difficulty_level: level,
      domain: "Z2",
      seed: seed0 + counter,
      display: { kind: "text", text: `${a} × ${b}` },
      response_kind: "int",
      correct_answer: a * b,
    });
  }

  // division with negatives, but ALWAYS exact (no remainder) as requested
  const qMin = level <= 1 ? 2 : level === 2 ? 5 : level === 3 ? 10 : 20;
  const qMax = level <= 1 ? 20 : level === 2 ? 99 : level === 3 ? 199 : 999;

  const absDivisor = randInt(rng, 2, Math.min(12, 4 + level * 2));
  const quotient = randInt(rng, qMin, qMax) * (rng() < 0.5 ? -1 : 1);

  // random sign for divisor; dividend becomes divisor*quotient
  const divisor = absDivisor * (rng() < 0.5 ? -1 : 1);
  const dividend = divisor * quotient;

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "Z2-MUL-DIV",
    node_id: "Z2.2",
    difficulty_level: level,
    domain: "Z2",
    seed: seed0 + counter,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "int",
    correct_answer: quotient,
  });
}

function genOrder(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  // Expression templates: a + b*c, (a+b)*c, a - b*c, (a-b)*c
  const a = randInt(rng, -20 - level * 10, 20 + level * 10);
  const b = randInt(rng, -12 - level * 6, 12 + level * 6);
  const c = randInt(rng, -12 - level * 6, 12 + level * 6);

  const t = pick(rng, ["a+bc", "(a+b)c", "a-bc", "(a-b)c"] as const);

  let text = "";
  let ans = 0;

  if (t === "a+bc") {
    text = `${a} + ${b} × ${c}`;
    ans = a + b * c;
  } else if (t === "(a+b)c") {
    text = `(${a} + ${b}) × ${c}`;
    ans = (a + b) * c;
  } else if (t === "a-bc") {
    text = `${a} − ${b} × ${c}`;
    ans = a - b * c;
  } else {
    text = `(${a} − ${b}) × ${c}`;
    ans = (a - b) * c;
  }

  // keep magnitude reasonable
  if (Math.abs(ans) > 9999) return genOrder(seed0, counter + 1, level);

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "Z4-ORDER",
    node_id: "Z4.1",
    difficulty_level: level,
    domain: "Z4",
    seed: seed0 + counter,
    display: { kind: "text", text },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genMissing(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  const [lo, hi] = levelRange(level, [0, 20], [0, 99], [0, 999], [0, 9999]);
  const x = randInt(rng, lo, hi);
  const b = randInt(rng, lo, hi);

  const form = pick(rng, ["x+b=c", "a+x=c", "x-b=c", "a-x=c"] as const);

  let text = "";
  let ans = x;

  if (form === "x+b=c") {
    const c = x + b;
    text = `□ + ${b} = ${c}`;
  } else if (form === "a+x=c") {
    const a = randInt(rng, lo, hi);
    const c = a + x;
    text = `${a} + □ = ${c}`;
  } else if (form === "x-b=c") {
    const c = x - b;
    text = `□ − ${b} = ${c}`;
  } else {
    const a = randInt(rng, lo, hi);
    const c = a - x;
    text = `${a} − □ = ${c}`;
  }

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "N1.9-MISSING",
    node_id: "N1.9.1",
    difficulty_level: level,
    domain: "N1.9",
    seed: seed0 + counter,
    display: { kind: "text", text },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genPow(seed0: number, counter: number, level: number): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  const baseMax = level <= 1 ? 6 : level === 2 ? 10 : level === 3 ? 12 : 15;
  const expMax = level <= 1 ? 3 : level === 2 ? 4 : level === 3 ? 5 : 6;

  let base = randInt(rng, -baseMax, baseMax);
  if (base === 0 && rng() < 0.3) base = 2; // avoid too many zeros
  const exp = randInt(rng, 0, expMax);

  // Avoid huge numbers
  const val = Math.pow(base, exp);
  if (!Number.isFinite(val) || Math.abs(val) > 500000) return genPow(seed0, counter + 1, level);

  const text = `${base}^${exp}`;

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: "P1-POW",
    node_id: "P1.1",
    difficulty_level: level,
    domain: "P1",
    seed: seed0 + counter,
    display: { kind: "text", text },
    response_kind: "int",
    correct_answer: Math.trunc(val),
  });
}

// ---- Additional blueprints (number sense, equations, decimals, granular S/M/D, area model) ----

function isDev() {
  try {
    return typeof import.meta !== "undefined" && !!(import.meta as any).env?.DEV;
  } catch {
    return false;
  }
}

function dpFromScale(scale: number) {
  const dp = Math.round(Math.log10(scale));
  return Number.isFinite(dp) && dp >= 0 ? dp : 0;
}

function formatScaled(scaled: number, scale: number) {
  const dp = dpFromScale(scale);
  const v = scaled / scale;
  // Danish-friendly comma, but accept both in input.
  return v.toFixed(dp).replace(".", ",");
}

function toScaled(value: number, dp: number) {
  const scale = Math.pow(10, dp);
  const correct_scaled = Math.round(value * scale);
  return { scale, correct_scaled };
}

function decStr(value: number, dp: number) {
  return value.toFixed(dp).replace(".", ",");
}

// --- Talforståelse ---

function genSequenceMissing(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, steps: number[]) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const step = pick(rng, steps);
  const start = randInt(rng, 0, level <= 1 ? 30 : 200);
  const a = start;
  const b = start + step;
  const c = start + 2 * step;
  const hole = randInt(rng, 0, 2);
  const parts = [a, b, c].map((x, i) => (i === hole ? "__" : String(x)));
  const answer = hole === 0 ? a : hole === 1 ? b : c;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T0",
    seed: seed0 + counter,
    display: { kind: "text", text: `${parts[0]}, ${parts[1]}, ${parts[2]}` },
    meta: { instruction: "Skriv tallet, der mangler" },
    response_kind: "int",
    correct_answer: answer,
  });
}

type MissingPos = "any" | "start" | "middle" | "end";

function chooseHoleIndex(rng: () => number, len: number, pos: MissingPos): number {
  if (len <= 1) return 0;
  if (pos === "start") return 0;
  if (pos === "end") return len - 1;
  if (pos === "middle") return randInt(rng, 1, len - 2);
  return randInt(rng, 0, len - 1);
}

function genConsecutiveMissingRange(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  maxN: number,
  len: number = 5,
  missingPos: MissingPos = "any"
): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const step = 1;
  const maxStart = Math.max(0, maxN - (len - 1) * step);
  const start = randInt(rng, 0, maxStart);
  const seq = Array.from({ length: len }, (_, i) => start + i * step);

  const hole = chooseHoleIndex(rng, len, missingPos);
  const parts = seq.map((x, i) => (i === hole ? "__" : String(x)));
  const answer = seq[hole]!;

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T0",
    seed: seed0 + counter,
    display: { kind: "text", text: parts.join(", ") },
    meta: { instruction: "Skriv tallet, der mangler" },
    response_kind: "int",
    correct_answer: answer,
  });
}

function genSkipCountMissing(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  steps: number[],
  maxN: number,
  len: number = 5,
  missingPos: MissingPos = "any"
): ItemInt {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const step = pick(rng, steps);
  const maxStart = Math.max(0, maxN - (len - 1) * step);
  const start = randInt(rng, 0, maxStart);
  const seq = Array.from({ length: len }, (_, i) => start + i * step);

  const hole = chooseHoleIndex(rng, len, missingPos);
  const parts = seq.map((x, i) => (i === hole ? "__" : String(x)));
  const answer = seq[hole]!;

  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T0",
    seed: seed0 + counter,
    display: { kind: "text", text: parts.join(", ") },
    meta: { instruction: "Skriv tallet, der mangler" },
    response_kind: "int",
    correct_answer: answer,
  });
}

function genPlaceValue(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, digits: number): ItemInstance {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  let n = 0;
  if (digits === 2) {
    // ensure tens != ones (avoid 55, 44, ...)
    const tens = randInt(rng, 1, 9);
    let ones = randInt(rng, 0, 9);
    if (ones === tens) ones = (ones + 1) % 10;
    n = tens * 10 + ones;
  } else {
    // ensure all digits different (avoid 333, 232, ...)
    const hundreds = randInt(rng, 1, 9);
    let tens = randInt(rng, 0, 9);
    while (tens === hundreds) tens = randInt(rng, 0, 9);
    let ones = randInt(rng, 0, 9);
    while (ones === hundreds || ones === tens) ones = randInt(rng, 0, 9);
    n = hundreds * 100 + tens * 10 + ones;
  }

  const s = String(n);
  const idx = randInt(rng, 0, s.length - 1);
  const d = parseInt(s[idx]!, 10);

  const choices = digits === 2 ? ["Enere", "Tiere"] : ["Hundreder", "Tiere", "Enere"];
  let correct_choice_index = 0;
  if (digits === 2) {
    // s[0]=tens -> Tiere (index 1), s[1]=ones -> Enere (index 0)
    correct_choice_index = idx === 0 ? 1 : 0;
  } else {
    // s[0]=hundreds, s[1]=tens, s[2]=ones
    correct_choice_index = idx;
  }

  return makeMCQItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T1",
    seed: seed0 + counter,
    display: { kind: "text", text: `I tallet ${n}: Hvilken plads står cifferet ${d} på?` },
    meta: { instruction: "Vælg pladsværdi" },
    response_kind: "mcq",
    choices,
    correct_choice_index,
  });
}



function genRegroupConcept(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);

  // 0: tens -> ones
  // 1: hundreds -> tens
  // 2: hundreds -> ones
  // 3: ones -> tens
  // 4: ones -> hundreds
  const kind = randInt(rng, 0, 4);

  if (kind === 0) {
    const tens = randInt(rng, 1, 9);
    return makeIntItem({
      seed0,
      counter,
      blueprint_id: blueprint,
      node_id: nodeId,
      difficulty_level: level,
      domain: "T1",
      seed: seed0 + counter,
      display: { kind: "text", text: `${tens} tiere er hvor mange enere?` },
      meta: { instruction: "Omveksl" },
      response_kind: "int",
      correct_answer: tens * 10,
    });
  }

  if (kind === 1) {
    const hundreds = randInt(rng, 1, 9);
    return makeIntItem({
      seed0,
      counter,
      blueprint_id: blueprint,
      node_id: nodeId,
      difficulty_level: level,
      domain: "T1",
      seed: seed0 + counter,
      display: { kind: "text", text: `${hundreds} hundreder er hvor mange tiere?` },
      meta: { instruction: "Omveksl" },
      response_kind: "int",
      correct_answer: hundreds * 10,
    });
  }

  if (kind === 2) {
    const hundreds = randInt(rng, 1, 9);
    return makeIntItem({
      seed0,
      counter,
      blueprint_id: blueprint,
      node_id: nodeId,
      difficulty_level: level,
      domain: "T1",
      seed: seed0 + counter,
      display: { kind: "text", text: `${hundreds} hundreder er hvor mange enere?` },
      meta: { instruction: "Omveksl" },
      response_kind: "int",
      correct_answer: hundreds * 100,
    });
  }

  if (kind === 3) {
    const tens = randInt(rng, 1, 9);
    const ones = tens * 10;
    return makeIntItem({
      seed0,
      counter,
      blueprint_id: blueprint,
      node_id: nodeId,
      difficulty_level: level,
      domain: "T1",
      seed: seed0 + counter,
      display: { kind: "text", text: `${ones} enere er hvor mange tiere?` },
      meta: { instruction: "Omveksl" },
      response_kind: "int",
      correct_answer: tens,
    });
  }

  const hundreds = randInt(rng, 1, 9);
  const ones = hundreds * 100;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T1",
    seed: seed0 + counter,
    display: { kind: "text", text: `${ones} enere er hvor mange hundreder?` },
    meta: { instruction: "Omveksl" },
    response_kind: "int",
    correct_answer: hundreds,
  });
}


function genCompareInts(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const max = level <= 1 ? 100 : level === 2 ? 1000 : 10000;
  let a = randInt(rng, 0, max);
  let b = randInt(rng, 0, max);
  if (a === b) b += 1;
  const ans = Math.max(a, b);
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T2",
    seed: seed0 + counter,
    display: { kind: "text", text: `Hvilket tal er størst? ${a} eller ${b}` },
    meta: { instruction: "Sammenlign" },
    response_kind: "int",
    correct_answer: ans,
  });
}


function genOrderListInts(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemOrder {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const max = level <= 1 ? 100 : 1000;

  const nItems = 4;
  const nums: number[] = [];
  while (nums.length < nItems) {
    const x = randInt(rng, 0, max);
    if (!nums.includes(x)) nums.push(x);
  }

  // Shuffle to avoid starting in sorted order.
  for (let i = nums.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [nums[i], nums[j]] = [nums[j]!, nums[i]!];
  }

  const values = nums.map((n) => String(n));
  const correct_order = values
    .map((_, i) => i)
    .sort((i, j) => nums[i]! - nums[j]!);

  // Rare case: already sorted ascending; reshuffle once.
  let isAlreadySorted = true;
  for (let k = 0; k < correct_order.length; k++) {
    if (correct_order[k] !== k) {
      isAlreadySorted = false;
      break;
    }
  }
  if (isAlreadySorted) {
    // simple swap
    [nums[0], nums[1]] = [nums[1]!, nums[0]!];
    values[0] = String(nums[0]);
    values[1] = String(nums[1]);
  }

  return makeOrderItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T2",
    seed: seed0 + counter,
    display: { kind: "text", text: values.join(", ") },
    meta: { instruction: "Træk tallene i stigende orden" },
    response_kind: "order",
    values,
    correct_order,
  });
}

function genRound(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const base = pick(rng, [10, 100]);
  const n = randInt(rng, base, level <= 1 ? 999 : 9999);
  const ans = Math.round(n / base) * base;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T3",
    seed: seed0 + counter,
    display: { kind: "text", text: `Afrund ${n} til nærmeste ${base}` },
    meta: { instruction: "Afrund" },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genEstimate(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const base = pick(rng, [10, 100]);
  const hi = base === 10 ? 300 : 2000;
  const a = randInt(rng, 0, hi);
  const b = randInt(rng, 0, hi);
  const ra = Math.round(a / base) * base;
  const rb = Math.round(b / base) * base;
  const ans = ra + rb;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T3",
    seed: seed0 + counter,
    display: { kind: "text", text: `Overslag: ${a} + ${b} ≈ ? (afrund til nærmeste ${base})` },
    meta: { instruction: "Overslag" },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genNumberlineMid(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, -50, 50);
  const step = pick(rng, [2, 4, 6, 8, 10]);
  const b = a + step;
  const ans = (a + b) / 2;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T4",
    seed: seed0 + counter,
    display: { kind: "text", text: `Hvilket tal ligger midt imellem ${a} og ${b}?` },
    response_kind: "int",
    correct_answer: ans,
  });
}

// --- Lighedstegn / manglende led ---

function genEqualSign(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, 1, 9 + level * 5);
  const b = randInt(rng, 1, 9 + level * 5);
  const c = randInt(rng, 1, 9 + level * 5);
  // a + b = __ + c
  const ans = a + b - c;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "E0",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} + ${b} = __ + ${c}` },
    meta: { instruction: "Skriv tallet, der mangler" },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genMissingAdd(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const sum = randInt(rng, 5, level <= 1 ? 20 : 100);
  const b = randInt(rng, 0, sum);
  const ans = sum - b;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "E0",
    seed: seed0 + counter,
    display: { kind: "text", text: `__ + ${b} = ${sum}` },
    meta: { instruction: "Skriv tallet, der mangler" },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genMissingSub(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, 10, level <= 1 ? 50 : 200);
  const b = randInt(rng, 0, a);
  const ans = a - b;
  // a - __ = b  => __ = a-b
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "E0",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} − __ = ${b}` },
    meta: { instruction: "Skriv tallet, der mangler" },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genInverseAddSub(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, 10, 99);
  const b = randInt(rng, 1, 30);
  const c = a - b;
  // If a - b = c, then c + b = a
  const ans = a;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "E1",
    seed: seed0 + counter,
    display: { kind: "text", text: `Hvis ${a} − ${b} = ${c}, hvad er ${c} + ${b}?` },
    meta: { instruction: "Tænk omvendt" },
    response_kind: "int",
    correct_answer: ans,
  });
}

// --- Decimaltal (fundament) ---


function genDecPlaceValue(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = pick(rng, [1, 2]);

  const whole = randInt(rng, 0, 9 + level * 10);
  const frac = randInt(rng, 0, dp === 1 ? 9 : 99);
  const value = whole + frac / Math.pow(10, dp);
  const str = decStr(value, dp);

  const positions = dp === 1 ? ["enere", "tiendedele"] : ["enere", "tiendedele", "hundrededele"];
  const pos = pick(rng, positions);

  const wholeDigit = whole % 10;
  const tenthDigit = dp === 1 ? frac : Math.floor(frac / 10);
  const hundredthDigit = dp === 2 ? frac % 10 : 0;

  let digit = wholeDigit;
  let hint = "før kommaet";
  if (pos === "tiendedele") {
    digit = tenthDigit;
    hint = "det første efter kommaet";
  } else if (pos === "hundrededele") {
    digit = hundredthDigit;
    hint = "det andet efter kommaet";
  }

  const choices = dp === 1 ? ["Enere", "Tiendedele"] : ["Enere", "Tiendedele", "Hundrededele"];
  const correct_choice_index =
    pos === "enere" ? 0 : pos === "tiendedele" ? 1 : 2;

  return makeMCQItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T10",
    seed: seed0 + counter,
    display: { kind: "text", text: `I tallet ${str}: Hvilken pladsværdi har cifferet ${digit} (${hint})?` },
    meta: { instruction: "Vælg pladsværdi" },
    response_kind: "mcq",
    choices,
    correct_choice_index,
  });
}


function genDecCompare(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = pick(rng, [1, 2]);
  const a = randInt(rng, 0, 200) / Math.pow(10, dp);
  let b = randInt(rng, 0, 200) / Math.pow(10, dp);
  if (a === b) b += 1 / Math.pow(10, dp);
  const ans = Math.max(a, b);
  const { scale, correct_scaled } = toScaled(ans, dp);
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T10",
    seed: seed0 + counter,
    display: { kind: "text", text: `Hvilket tal er størst? ${decStr(a, dp)} eller ${decStr(b, dp)}` },
    meta: { instruction: "Sammenlign" },
    response_kind: "number",
    scale,
    correct_scaled,
  });
}


function genDecOrder(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemOrder {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = pick(rng, [1, 2]);
  const scale = Math.pow(10, dp);

  const nItems = 4;
  const scaledVals: number[] = [];
  while (scaledVals.length < nItems) {
    const s = randInt(rng, 0, 200);
    if (!scaledVals.includes(s)) scaledVals.push(s);
  }

  // Shuffle
  for (let i = scaledVals.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [scaledVals[i], scaledVals[j]] = [scaledVals[j]!, scaledVals[i]!];
  }

  const nums = scaledVals.map((s) => s / scale);
  const values = nums.map((n) => decStr(n, dp));
  const correct_order = values
    .map((_, i) => i)
    .sort((i, j) => nums[i]! - nums[j]!);

  return makeOrderItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T10",
    seed: seed0 + counter,
    display: { kind: "text", text: values.join(", ") },
    meta: { instruction: "Træk tallene i stigende orden" },
    response_kind: "order",
    values,
    correct_order,
  });
}

function genDecRound(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = 2;
  const n = randInt(rng, 0, 999) / 100;
  const ans = Math.round(n * 10) / 10;
  const { scale, correct_scaled } = toScaled(ans, 1);
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "T10",
    seed: seed0 + counter,
    display: { kind: "text", text: `Afrund ${decStr(n, dp)} til 1 decimal` },
    meta: { instruction: "Afrund" },
    response_kind: "number",
    scale,
    correct_scaled,
  });
}

// --- Decimaltal i domæner ---

function genDecAdd(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, carry: boolean) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = pick(rng, [1, 2]);
  const scale = Math.pow(10, dp);
  let a = randInt(rng, 0, 500);
  let b = randInt(rng, 0, 500);
  if (carry) {
    // Force a carry in the fractional part
    const af = randInt(rng, dp === 1 ? 5 : 50, scale - 1);
    const bf = randInt(rng, dp === 1 ? 5 : 50, scale - 1);
    a = randInt(rng, 0, 50) * scale + af;
    b = randInt(rng, 0, 50) * scale + bf;
  } else {
    a = randInt(rng, 0, 50) * scale + randInt(rng, 0, scale - 1);
    b = randInt(rng, 0, 50) * scale + randInt(rng, 0, scale - 1);
  }
  const sumScaled = a + b;
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "A11",
    seed: seed0 + counter,
    display: {
      kind: "text",
      text: `${formatScaled(a, scale)} + ${formatScaled(b, scale)}`,
    },
    response_kind: "number",
    scale,
    correct_scaled: sumScaled,
  });
}

function genDecSub(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, borrow: boolean) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = pick(rng, [1, 2]);
  const scale = Math.pow(10, dp);
  let a = randInt(rng, 10, 99) * scale + randInt(rng, 0, scale - 1);
  let b = randInt(rng, 0, 50) * scale + randInt(rng, 0, scale - 1);
  if (a < b) [a, b] = [b, a];
  if (borrow) {
    // force borrow from whole part: frac(a) < frac(b)
    const fracA = randInt(rng, 0, Math.floor(scale / 2) - 1);
    const fracB = randInt(rng, Math.floor(scale / 2), scale - 1);
    a = randInt(rng, 10, 99) * scale + fracA;
    b = randInt(rng, 0, 50) * scale + fracB;
    if (a < b) a = b + randInt(rng, 1, 50) * scale;
  }
  const diffScaled = a - b;
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "S11",
    seed: seed0 + counter,
    display: { kind: "text", text: `${formatScaled(a, scale)} − ${formatScaled(b, scale)}` },
    response_kind: "number",
    scale,
    correct_scaled: diffScaled,
  });
}

function genDecTimesInt(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = pick(rng, [1, 2]);
  const scale = Math.pow(10, dp);
  const aScaled = randInt(rng, 10 * scale, 99 * scale);
  const b = randInt(rng, 2, 12);
  const prodScaled = aScaled * b;
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "M11",
    seed: seed0 + counter,
    display: { kind: "text", text: `${formatScaled(aScaled, scale)} × ${b}` },
    response_kind: "number",
    scale,
    correct_scaled: prodScaled,
  });
}

function genDecTimesDec(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dpA = pick(rng, [1, 2]);
  const dpB = pick(rng, [1, 2]);
  const scaleA = Math.pow(10, dpA);
  const scaleB = Math.pow(10, dpB);
  const aScaled = randInt(rng, 10 * scaleA, 99 * scaleA);
  const bScaled = randInt(rng, 10 * scaleB, 99 * scaleB);
  // product scale is scaleA*scaleB
  const prodScaled = aScaled * bScaled;
  const scale = scaleA * scaleB;
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "M11",
    seed: seed0 + counter,
    display: { kind: "text", text: `${formatScaled(aScaled, scaleA)} × ${formatScaled(bScaled, scaleB)}` },
    response_kind: "number",
    scale,
    correct_scaled: prodScaled,
  });
}

function genDivByPow10(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const k = pick(rng, [1, 2, 3]);
  const scale = Math.pow(10, 2);
  const aScaled = randInt(rng, 10 * scale, 999 * scale);
  const div = Math.pow(10, k);
  const ansScaled = Math.round(aScaled / div);
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "D11",
    seed: seed0 + counter,
    display: { kind: "text", text: `${formatScaled(aScaled, scale)} ÷ ${div}` },
    response_kind: "number",
    scale,
    correct_scaled: ansScaled,
  });
}

function genDecDivInt(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const dp = pick(rng, [1, 2]);
  const scale = Math.pow(10, dp);
  const divisor = randInt(rng, 2, 12);
  // Choose quotient with dp decimals (terminating): scaled dividend = quotientScaled * divisor
  const qScaled = randInt(rng, 10 * scale, 99 * scale);
  const dividendScaled = qScaled * divisor;
  return makeNumberItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "D11",
    seed: seed0 + counter,
    display: { kind: "text", text: `${formatScaled(dividendScaled, scale)} ÷ ${divisor}` },
    response_kind: "number",
    scale,
    correct_scaled: qScaled,
  });
}

// --- Subtraktion (granulær) ---

function genSubRange(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, aLo: number, aHi: number, bLo: number, bHi: number, requireBorrow: boolean, allowZeroCross: boolean = false) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  let a = 0;
  let b = 0;
  for (let tries = 0; tries < 50; tries++) {
    a = randInt(rng, aLo, aHi);
    b = randInt(rng, bLo, Math.min(bHi, a));
    if (a < b) continue;
    if (requireBorrow) {
      const aStr = String(a);
      const bStr = String(b).padStart(aStr.length, "0");
      let borrow = false;
      for (let i = aStr.length - 1; i >= 0; i--) {
        if (parseInt(aStr[i]!, 10) < parseInt(bStr[i]!, 10)) borrow = true;
      }
      if (!borrow) continue;
      if (!allowZeroCross && /0/.test(aStr.slice(0, -1))) {
        // avoid zero-cross borrow in non-zero-cross skills
      }
      return makeIntItem({
        seed0,
        counter,
        blueprint_id: blueprint,
        node_id: nodeId,
        difficulty_level: level,
        domain: "S",
        seed: seed0 + counter,
        display: { kind: "text", text: `${a} − ${b}` },
        response_kind: "int",
        correct_answer: a - b,
      });
    } else {
      // require no borrow in any column
      const aStr = String(a);
      const bStr = String(b).padStart(aStr.length, "0");
      let borrow = false;
      for (let i = aStr.length - 1; i >= 0; i--) {
        if (parseInt(aStr[i]!, 10) < parseInt(bStr[i]!, 10)) borrow = true;
      }
      if (borrow) continue;
      return makeIntItem({
        seed0,
        counter,
        blueprint_id: blueprint,
        node_id: nodeId,
        difficulty_level: level,
        domain: "S",
        seed: seed0 + counter,
        display: { kind: "text", text: `${a} − ${b}` },
        response_kind: "int",
        correct_answer: a - b,
      });
    }
  }
  // fallback
  a = randInt(rng, aLo, aHi);
  b = randInt(rng, bLo, Math.min(bHi, a));
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "S",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} − ${b}` },
    response_kind: "int",
    correct_answer: a - b,
  });
}

function genSubWord(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const have = randInt(rng, 10, 99 + level * 50);
  const give = randInt(rng, 1, Math.min(have, 30 + level * 20));
  const ans = have - give;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "S-WP",
    seed: seed0 + counter,
    display: { kind: "text", text: `Du har ${have} æbler og giver ${give} væk. Hvor mange har du tilbage?` },
    response_kind: "int",
    correct_answer: ans,
  });
}

// --- Multiplikation (inkl. arealmodellen) ---

function splitTens(n: number) {
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  return ones === 0 ? [tens] : [tens, ones];
}

function splitHundreds(n: number) {
  const hundreds = Math.floor(n / 100) * 100;
  const rest = n % 100;
  const tens = Math.floor(rest / 10) * 10;
  const ones = rest % 10;
  const parts: number[] = [];
  if (hundreds) parts.push(hundreds);
  if (tens) parts.push(tens);
  if (ones) parts.push(ones);
  return parts.length ? parts : [0];
}

function genMulTables(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, maxA: number, maxB: number) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, 0, maxA);
  const b = randInt(rng, 0, maxB);
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "M",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} × ${b}` },
    response_kind: "int",
    correct_answer: a * b,
  });
}

function genMulRepeatedAdd(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, 2, 9);
  const b = randInt(rng, 2, 6);
  const terms = Array.from({ length: b }, () => String(a)).join(" + ");
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "M0",
    seed: seed0 + counter,
    display: { kind: "text", text: `${terms} = ?` },
    response_kind: "int",
    correct_answer: a * b,
  });
}

function genMulByPow10(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const k = pick(rng, [1, 2, 3]);
  const a = randInt(rng, 2, 999);
  const mul = Math.pow(10, k);
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "M0",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} × ${mul}` },
    response_kind: "int",
    correct_answer: a * mul,
  });
}

function genMul2D1D(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, requireCarry: boolean) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  for (let tries = 0; tries < 80; tries++) {
    const a = randInt(rng, 10, 99);
    const b = randInt(rng, 2, 9);
    const ones = (a % 10) * b;
    const carry = ones >= 10;
    if (requireCarry !== carry) continue;
    return makeIntItem({
      seed0,
      counter,
      blueprint_id: blueprint,
      node_id: nodeId,
      difficulty_level: level,
      domain: "M1",
      seed: seed0 + counter,
      display: { kind: "text", text: `${a} × ${b}` },
      response_kind: "int",
      correct_answer: a * b,
    });
  }
  return genMulTables(seed0, counter, level, nodeId, blueprint, 99, 9);
}

function genAreaModel(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, a: number, b: number, aParts: number[], bParts: number[]) {
  const correct = a * b;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "M-AREA",
    seed: seed0 + counter,
    display: { kind: "text", text: `${a} × ${b}` },
    response_kind: "int",
    correct_answer: correct,
  });
}

function genArea2Dx1D(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, hard: boolean) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, hard ? 20 : 10, hard ? 99 : 69);
  const b = randInt(rng, hard ? 6 : 2, 9);
  const aParts = splitTens(a);
  const bParts = [b];
  return genAreaModel(seed0, counter, level, nodeId, blueprint, a, b, aParts, bParts);
}

function genArea2Dx2D(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, 12, 99);
  const b = randInt(rng, 12, 99);
  return genAreaModel(seed0, counter, level, nodeId, blueprint, a, b, splitTens(a), splitTens(b));
}

function genArea3Dx2D(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const a = randInt(rng, 120, 999);
  const b = randInt(rng, 12, 99);
  return genAreaModel(seed0, counter, level, nodeId, blueprint, a, b, splitHundreds(a), splitTens(b));
}

function genMulWord(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const rows = randInt(rng, 2, 9 + level);
  const cols = randInt(rng, 2, 9 + level);
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "M-WP",
    seed: seed0 + counter,
    display: { kind: "text", text: `Der er ${rows} rækker med ${cols} stole. Hvor mange stole i alt?` },
    response_kind: "int",
    correct_answer: rows * cols,
  });
}

// --- Division (granulær) ---

function genDivTimesTables(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, maxDiv: number) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const divisor = randInt(rng, 2, maxDiv);
  const quotient = randInt(rng, 0, 12);
  const dividend = divisor * quotient;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "D",
    seed: seed0 + counter,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "int",
    correct_answer: quotient,
  });
}

function genDivConceptWord(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const divisor = randInt(rng, 2, 9);
  const quotient = randInt(rng, 2, 12);
  const dividend = divisor * quotient;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "D0",
    seed: seed0 + counter,
    display: { kind: "text", text: `${dividend} slik deles ligeligt mellem ${divisor} børn. Hvor mange får hver?` },
    response_kind: "int",
    correct_answer: quotient,
  });
}

function genDiv2D1DNoRem(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const divisor = randInt(rng, 2, 9);
  const quotient = randInt(rng, 10, 99);
  const dividend = divisor * quotient;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "D1",
    seed: seed0 + counter,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "int",
    correct_answer: quotient,
  });
}

function genDiv2D1DRem(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemQR {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const divisor = randInt(rng, 2, 9);
  const quotient = randInt(rng, 10, 99);
  const remainder = randInt(rng, 1, divisor - 1);
  const dividend = divisor * quotient + remainder;
  return makeQRItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "D2",
    seed: seed0 + counter,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "quotient_remainder",
    divisor,
    correct_quotient: quotient,
    correct_remainder: remainder,
  });
}

function genDivWord(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId) {
  const rng = mulberry32((seed0 + counter * 1013) >>> 0);
  const divisor = randInt(rng, 2, 9);
  const quotient = randInt(rng, 2, 12 + level * 5);
  const dividend = divisor * quotient;
  return makeIntItem({
    seed0,
    counter,
    blueprint_id: blueprint,
    node_id: nodeId,
    difficulty_level: level,
    domain: "D-WP",
    seed: seed0 + counter,
    display: { kind: "text", text: `${dividend} kr deles ligeligt mellem ${divisor} personer. Hvor mange kr får hver?` },
    response_kind: "int",
    correct_answer: quotient,
  });
}



// ---- Compatibility blueprint aliases (older/newer naming) ----

function makeDecAddItem(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string, aScaled: number, bScaled: number, scale: number) {
  const dp = dpFromScale(scale);
  const a = aScaled / scale;
  const b = bScaled / scale;
  const text = `${formatScaled(aScaled, scale)} + ${formatScaled(bScaled, scale)}`;
  return makeNumberItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "addition",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text },
    response_kind: "number",
    correct_scaled: aScaled + bScaled,
    scale,
  });
}

function genDecAddCompat(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string, sameDpOnly: boolean) {
  const rng = mkRng(seed0 + counter * 23 + level);
  const dpA = sameDpOnly ? choice(rng, [1, 2]) : choice(rng, [0, 1, 2]);
  const dpB = sameDpOnly ? dpA : choice(rng, [0, 1, 2]);
  const scale = 10 ** Math.max(dpA, dpB);
  const aScaled = randInt(rng, 0, 999 * scale);
  const bScaled = randInt(rng, 0, 999 * scale);
  return makeDecAddItem(seed0, counter, level, nodeId, blueprint, aScaled, bScaled, scale);
}

function genSubFromTen(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 19 + level);
  const b = randInt(rng, 0, 10);
  const a = 10;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "subtraction",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text: `${a} − ${b}` },
    response_kind: "int",
    correct_answer: a - b,
  });
}

function genMulArrays(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 31 + level);
  const rows = randInt(rng, 2, 10);
  const cols = randInt(rng, 2, 10);
  const text = `Der er ${rows} rækker med ${cols} i hver. Hvor mange i alt?`;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "multiplication",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text },
    response_kind: "int",
    correct_answer: rows * cols,
  });
}

function genDivConcept(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 41 + level);
  const divisor = randInt(rng, 2, 10);
  const q = randInt(rng, 2, 12);
  const dividend = divisor * q;
  const text = `Del ${dividend} i ${divisor} lige store grupper. Hvor mange i hver?`;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "division",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text },
    response_kind: "int",
    correct_answer: q,
  });
}

function genDivFacts(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 43 + level);
  const divisor = randInt(rng, 2, 10);
  const q = randInt(rng, 0, 10);
  const dividend = divisor * q;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "division",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "int",
    correct_answer: q,
  });
}

function genDivNoRem2D(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 29 + level);
  const divisor = randInt(rng, 2, 9);
  const q = randInt(rng, 2, 99);
  let dividend = divisor * q;
  // force 2-3 digits
  if (dividend < 10) dividend *= 10;
  if (dividend > 999) dividend = divisor * randInt(rng, 2, 99);
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "division",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "int",
    correct_answer: dividend / divisor,
  });
}

function genDivRem2D(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 17 + level);
  const divisor = randInt(rng, 2, 9);
  const q = randInt(rng, 1, 99);
  const r = randInt(rng, 1, divisor - 1);
  const dividend = divisor * q + r;
  return makeQRItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "division",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "quotient_remainder",
    divisor,
    correct_quotient: q,
    correct_remainder: r,
  });
}

function genDivZeroInQuotient(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 53 + level);
  const divisor = randInt(rng, 2, 9);
  // quotient with a zero digit in the middle: a0b
  const a = randInt(rng, 1, 9);
  const b = randInt(rng, 1, 9);
  const q = a * 100 + b;
  const dividend = q * divisor;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "division",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "fraction", num: dividend, den: divisor },
    response_kind: "int",
    correct_answer: q,
  });
}

function genMissingMixed(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 61 + level);
  const which = choice(rng, ["add", "sub", "mul", "div"] as const);

  if (which === "add") {
    const a = randInt(rng, 0, 99);
    const b = randInt(rng, 0, 99);
    const missingLeft = randInt(rng, 0, 1) === 0;
    const text = missingLeft ? `□ + ${b} = ${a + b}` : `${a} + □ = ${a + b}`;
    return makeIntItem({
      seed0,
      counter,
      node_id: nodeId,
      domain: "equations",
      blueprint_id: blueprint,
      difficulty_level: level,
      display: { kind: "text", text },
      response_kind: "int",
      correct_answer: missingLeft ? a : b,
    });
  }

  if (which === "sub") {
    const a = randInt(rng, 10, 99);
    const b = randInt(rng, 0, a);
    const missingLeft = randInt(rng, 0, 1) === 0;
    const text = missingLeft ? `□ − ${b} = ${a - b}` : `${a} − □ = ${a - b}`;
    return makeIntItem({
      seed0,
      counter,
      node_id: nodeId,
      domain: "equations",
      blueprint_id: blueprint,
      difficulty_level: level,
      display: { kind: "text", text },
      response_kind: "int",
      correct_answer: missingLeft ? a : b,
    });
  }

  if (which === "mul") {
    const a = randInt(rng, 2, 12);
    const b = randInt(rng, 2, 12);
    const missingLeft = randInt(rng, 0, 1) === 0;
    const text = missingLeft ? `□ × ${b} = ${a * b}` : `${a} × □ = ${a * b}`;
    return makeIntItem({
      seed0,
      counter,
      node_id: nodeId,
      domain: "equations",
      blueprint_id: blueprint,
      difficulty_level: level,
      display: { kind: "text", text },
      response_kind: "int",
      correct_answer: missingLeft ? a : b,
    });
  }

  // div
  const divisor = randInt(rng, 2, 10);
  const q = randInt(rng, 1, 12);
  const dividend = divisor * q;
  const missingDivisor = randInt(rng, 0, 1) === 0;
  const text = missingDivisor ? `${dividend} ÷ □ = ${q}` : `□ ÷ ${divisor} = ${q}`;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "equations",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text },
    response_kind: "int",
    correct_answer: missingDivisor ? divisor : dividend,
  });
}

function genNegAddSubNode(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 67 + level);
  const a = randInt(rng, -30, 30);
  const b = randInt(rng, -30, 30);
  const op = choice(rng, ["+", "−"] as const);
  const ans = op === "+" ? a + b : a - b;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "addition",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text: `${a} ${op} ${b}` },
    response_kind: "int",
    correct_answer: ans,
  });
}

function genNegMulDivNode(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 71 + level);
  const mode = choice(rng, ["mul", "div"] as const);
  const a = randInt(rng, -12, 12);
  const b = randInt(rng, -12, 12);

  if (mode === "mul") {
    const x = a === 0 ? -1 : a;
    const y = b === 0 ? 2 : b;
    return makeIntItem({
      seed0,
      counter,
      node_id: nodeId,
      domain: "multiplication",
      blueprint_id: blueprint,
      difficulty_level: level,
      display: { kind: "text", text: `${x} × ${y}` },
      response_kind: "int",
      correct_answer: x * y,
    });
  }

  const divisor = b === 0 ? 2 : b;
  const q = randInt(rng, -12, 12);
  const dividend = divisor * q;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "division",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text: `${dividend} ÷ ${divisor}` },
    response_kind: "int",
    correct_answer: q,
  });
}

function genNegCompare(seed0: number, counter: number, level: DifficultyLevel, nodeId: string, blueprint: string) {
  const rng = mkRng(seed0 + counter * 73 + level);
  let a = randInt(rng, -50, 50);
  let b = randInt(rng, -50, 50);
  if (a == b) b += 1;
  const text = `Hvilket tal er størst? ${a} eller ${b}`;
  return makeIntItem({
    seed0,
    counter,
    node_id: nodeId,
    domain: "numbers",
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text },
    response_kind: "int",
    correct_answer: Math.max(a, b),
  });
}




// --- Compatibility wrappers (older generator names referenced by genFromBlueprint) ---
function genRounding(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genRound(seed0, counter, level, nodeId, blueprint);
}

function genInverse(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genInverseAddSub(seed0, counter, level, nodeId, blueprint);
}

function genDecMulTimesInt(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genDecTimesInt(seed0, counter, level, nodeId, blueprint);
}

function genDecMulTimesDec(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genDecTimesDec(seed0, counter, level, nodeId, blueprint);
}

function genDecDivByInt(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genDecDivInt(seed0, counter, level, nodeId, blueprint);
}

function genMulTimesTables(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genMulTables(seed0, counter, level, nodeId, blueprint, 10, 10);
}

function genMul2Dx1D(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  requireCarry: boolean
): ItemInstance {
  return genMul2D1D(seed0, counter, level, nodeId, blueprint, requireCarry);
}

function genMul3Dx1D(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId
): ItemInstance {
  const rng = makeRng(seed0 + counter * 9973 + blueprint.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0));
  const a = randInt(rng, 100, 999);
  const b = randInt(rng, 2, 9);
  const prod = a * b;
  return makeIntItem({
    seed0,
    counter,
    domain: "M",
    node_id: nodeId,
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text: `${a} × ${b}` },
    response_kind: "int",
    correct_answer: prod,
  });
}

function genMulArea2Dx1D(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  hard: boolean
): ItemInstance {
  return genArea2Dx1D(seed0, counter, level, nodeId, blueprint, hard);
}

function genMulArea2Dx2D(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genArea2Dx2D(seed0, counter, level, nodeId, blueprint);
}

function genMulArea3Dx2D(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genArea3Dx2D(seed0, counter, level, nodeId, blueprint);
}

function genSubLe10(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genSubRange(seed0, counter, level, nodeId, blueprint, 0, 10, 0, 10, false, false);
}

function genSubFrom10(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genSubFromTen(seed0, counter, level, nodeId, blueprint);
}

function genSubCrossTen(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  return genSubRange(seed0, counter, level, nodeId, blueprint, 10, 99, 1, 9, true, false);
}

function genSub2D1D(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  requireBorrow: boolean
): ItemInstance {
  return genSubRange(seed0, counter, level, nodeId, blueprint, 10, 99, 1, 9, requireBorrow, false);
}

function genSub2D2D(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  requireBorrow: boolean
): ItemInstance {
  return genSubRange(seed0, counter, level, nodeId, blueprint, 10, 99, 10, 99, requireBorrow, false);
}

function genSub3D3D(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  mode: "none" | "borrow" | "over_zero"
): ItemInstance {
  const requireBorrow = mode !== "none";
  const allowZeroCross = mode === "over_zero";
  return genSubRange(seed0, counter, level, nodeId, blueprint, 100, 999, 100, 999, requireBorrow, allowZeroCross);
}


type SignConstraint = "any" | "pos" | "neg";

function signOk(x: number, s: SignConstraint): boolean {
  if (s === "any") return true;
  if (s === "pos") return x >= 0;
  return x < 0;
}

function genNumberLine(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId, startSign: SignConstraint = "any", endSign: SignConstraint = "any"): ItemInstance {
  const rng = makeRng(seed0 + counter * 6151);

  for (let attempt = 0; attempt < 50; attempt++) {
    const steps = randInt(rng, 2, 12);
    const dirRight = flip(rng);
    const delta = dirRight ? steps : -steps;

    const start =
      startSign === "pos"
        ? randInt(rng, 0, 20)
        : startSign === "neg"
          ? randInt(rng, -20, -1)
          : randInt(rng, -20, 20);

    const target = start + delta;
    if (!signOk(target, endSign)) continue;

    // Keep the displayed window reasonable.
    const min = Math.min(start, target) - 3;
    const max = Math.max(start, target) + 3;

    return makeIntItem({
      seed0,
      counter,
      domain: "T4",
      node_id: nodeId,
      blueprint_id: blueprint,
      difficulty_level: level,
      display: { kind: "text", text: "" },
      meta: {
        instruction: "Tallinje",
        numberline: { start, steps, dirRight, delta, target, min, max },
      },
      response_kind: "int",
      correct_answer: target,
    });
  }

  // Fallback: unconstrained
  const start = randInt(rng, -20, 20);
  const steps = randInt(rng, 2, 12);
  const dirRight = flip(rng);
  const delta = dirRight ? steps : -steps;
  const target = start + delta;
  const min = Math.min(start, target) - 3;
  const max = Math.max(start, target) + 3;

  return makeIntItem({
    seed0,
    counter,
    domain: "T4",
    node_id: nodeId,
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text: "" },
    meta: {
      instruction: "Tallinje",
      numberline: { start, steps, dirRight, delta, target, min, max },
    },
    response_kind: "int",
    correct_answer: target,
  });
}


function genDivRemainderSkill(
  seed0: number,
  counter: number,
  level: number,
  nodeId: string,
  blueprint: BlueprintId,
  harder: boolean
): ItemInstance {
  const rng = makeRng(seed0 + counter * 9001);
  const d = randInt(rng, 2, 9);
  const qMin = harder ? 4 : 2;
  const qMax = harder ? 18 : 12;
  const q = randInt(rng, qMin, qMax);
  const r = randInt(rng, 1, d - 1);
  const n = d * q + r;
  return makeQRItem({
    seed0,
    counter,
    domain: "D",
    node_id: nodeId,
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "fraction", num: n, den: d },
    response_kind: "quotient_remainder",
    divisor: d,
    correct_quotient: q,
    correct_remainder: r,
  });
}

// Addition with mixed decimal lengths (alignment practice)
function genDecAddMixedLen(seed0: number, counter: number, level: number, nodeId: string, blueprint: BlueprintId): ItemInstance {
  const rng = makeRng(seed0 + counter * 31337);

  const scaleA = flip(rng) ? 10 : 100;
  const scaleB = scaleA === 10 ? 100 : 10; // force different lengths
  const scale = 100;

  const aScaled = randInt(rng, 1 * scaleA, 99 * scaleA);
  const bScaled = randInt(rng, 1 * scaleB, 99 * scaleB);

  const aStr = formatScaled(aScaled, scaleA);
  const bStr = formatScaled(bScaled, scaleB);

  const aTo100 = aScaled * (scale / scaleA);
  const bTo100 = bScaled * (scale / scaleB);
  const sTo100 = aTo100 + bTo100;

  return makeNumberItem({
    seed0,
    counter,
    domain: "A",
    node_id: nodeId,
    blueprint_id: blueprint,
    difficulty_level: level,
    display: { kind: "text", text: `${aStr} + ${bStr}` },
    response_kind: "number",
    scale,
    correct_scaled: sTo100,
  });
}

function digitsLeftPad(n: number, width: number): number[] {
  const s = String(Math.max(0, Math.trunc(n)));
  const arr = s.split("").map((c) => Math.trunc(Number(c)));
  const pad = Math.max(0, width - arr.length);
  return Array(pad).fill(0).concat(arr);
}

/**
 * Generate a column-addition item where the student must fill in carry-in digits and the result digits.
 * All structured arrays are left-to-right.
 */
function genColumnAdd(seed0: number, counter: number, level: number, node_id: string, blueprint_id: string): ItemColumnAdd {
  const rng = makeRng(seed0 + counter * 9973 + blueprint_id.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0));

  // Choose number of digits by level (coarse heuristic)
  const n = level <= 2 ? 2 : level === 3 ? 3 : 4;

  // Generate two n-digit numbers (allow leading zeros? no: keep top digit 1..9)
  const aTop = randInt(rng, 1, 9);
  const bTop = randInt(rng, 1, 9);
  const aRest = Array.from({ length: n - 1 }, () => randInt(rng, 0, 9));
  const bRest = Array.from({ length: n - 1 }, () => randInt(rng, 0, 9));
  const aDigits = [aTop, ...aRest];
  const bDigits = [bTop, ...bRest];
  const a = Number(aDigits.join(""));
  const b = Number(bDigits.join(""));

  // Compute carry-in per column (left-to-right) and result digits (left-to-right, length n+1)
  const carryIn = Array(n).fill(0);
  const res = Array(n).fill(0);
  let carry = 0;
  for (let i = n - 1; i >= 0; i--) {
    carryIn[i] = carry;
    const sum = aDigits[i] + bDigits[i] + carry;
    res[i] = sum % 10;
    carry = Math.floor(sum / 10);
  }
  const resultDigits = [carry, ...res];
  const correct = a + b;

  return makeCommonItem<ItemColumnAdd>({
    seed0,
    counter,
    blueprint_id,
    node_id,
    difficulty_level: level,
    response_kind: "column_add",
    n,
    a,
    b,
    correct_answer: correct,
    display: { kind: "text", text: "" },
    meta: {
      kind: "column_add",
      a_digits: aDigits,
      b_digits: bDigits,
      carry_in: carryIn,
      result_digits: resultDigits,
    },
  });
}

function genFromBlueprint(blueprint_id: BlueprintId, seed0: number, counter: number, level: number): ItemInstance {
  if ((ADD_BP as any)[blueprint_id as any]) {
    return genAddProgress(seed0, counter, String(blueprint_id));
  }

  switch (blueprint_id) {
    // Capstones / legacy
    case "N1.4-ADD":
      return genAdd(seed0, counter, level);
    case "A4-COLUMN_ADD":
      return genColumnAdd(seed0, counter, level, "A4.6", blueprint_id);
    case "N1.5-SUB":
      return genSub(seed0, counter, level);
    case "N1.7-MUL":
      return genMul(seed0, counter, level);
    case "N1.18-DIV-REM":
      return genDivRem(seed0, counter, level);
    case "Z2-ADD-SUB":
      return genNegAddSub(seed0, counter, level);
    case "Z2-MUL-DIV":
      return genNegMulDiv(seed0, counter, level);
    case "Z4-ORDER":
      return genOrder(seed0, counter, level);
    case "N1.9-MISSING":
      return genMissing(seed0, counter, level);
    case "P1-POW":
      return genPow(seed0, counter, level);


    // Talforståelse
    case "T0-SEQUENCE-0-10":
      return genConsecutiveMissingRange(seed0, counter, level, "T0.1", blueprint_id, 10, 5, "any");
    case "T0-SEQUENCE-0-100":
      return genConsecutiveMissingRange(seed0, counter, level, "T0.1b", blueprint_id, 100, 6, "any");
    case "T0-SEQUENCE-0-1000":
      return genConsecutiveMissingRange(seed0, counter, level, "T0.1c", blueprint_id, 1000, 7, "any");

    case "T0-SKIPCOUNT-END-2-5-10":
      return genSkipCountMissing(seed0, counter, level, "T0.2", blueprint_id, [2, 5, 10], 1000, 5, "end");
    case "T0-SKIPCOUNT-MIDDLE-2-5-10":
      return genSkipCountMissing(seed0, counter, level, "T0.2b", blueprint_id, [2, 5, 10], 1000, 5, "middle");
    case "T0-SKIPCOUNT-START-2-5-10":
      return genSkipCountMissing(seed0, counter, level, "T0.2c", blueprint_id, [2, 5, 10], 1000, 5, "start");

    // Legacy ids (backwards compatible)
    case "T0-SEQUENCE-MISSING":
      return genSequenceMissing(seed0, counter, level, "T0.1", blueprint_id, [1]);
    case "T0-SKIPCOUNT-2-5-10":
      return genSequenceMissing(seed0, counter, level, "T0.2", blueprint_id, [2, 5, 10]);

    case "T1-PLACEVALUE-2D":
      return genPlaceValue(seed0, counter, level, "T1.1", blueprint_id, 2);
    case "T1-PLACEVALUE-3D":
      return genPlaceValue(seed0, counter, level, "T1.2", blueprint_id, 3);
    case "T1-REGROUP-CONCEPT":
      return genRegroupConcept(seed0, counter, level, "T1.3", blueprint_id);
    case "T2-COMPARE-LE-1000":
      return genCompareInts(seed0, counter, level, "T2.1", blueprint_id);
    case "T2-ORDER-LE-1000":
      return genOrderListInts(seed0, counter, level, "T2.2", blueprint_id);
    case "T3-ROUND-10-100":
      return genRounding(seed0, counter, level, "T3.1", blueprint_id);
    case "T3-ESTIMATE":
      return genEstimate(seed0, counter, level, "T3.2", blueprint_id);

    case "T4-NUMBERLINE-POSPOS":
      return genNumberLine(seed0, counter, level, "T4.1", blueprint_id, "pos", "pos");
    case "T4-NUMBERLINE-POSNEG":
      return genNumberLine(seed0, counter, level, "T4.1b", blueprint_id, "pos", "neg");
    case "T4-NUMBERLINE-NEGPOS":
      return genNumberLine(seed0, counter, level, "T4.1c", blueprint_id, "neg", "pos");
    case "T4-NUMBERLINE-NEGNEG":
      return genNumberLine(seed0, counter, level, "T4.1d", blueprint_id, "neg", "neg");

    // Legacy id (backwards compatible)
    case "T4-NUMBERLINE-INTEGERS":
      return genNumberLine(seed0, counter, level, "T4.1", blueprint_id);


    // Lighedstegn / enkle ligninger
    case "E0-EQUAL-SIGN":
      return genEqualSign(seed0, counter, level, "E0.1", blueprint_id);
    case "E0-MISSING-ADD":
      return genMissingAdd(seed0, counter, level, "E0.2", blueprint_id);
    case "E0-MISSING-SUB":
      return genMissingSub(seed0, counter, level, "E0.3", blueprint_id);
    case "E1-INVERSE-ADD-SUB":
      return genInverse(seed0, counter, level, "E1.1", blueprint_id);

    // Decimaltal fundament
    case "T10-DEC-PLACEVALUE":
      return genDecPlaceValue(seed0, counter, level, "T10.1", blueprint_id);
    case "T10-DEC-ORDER":
      return genDecOrder(seed0, counter, level, "T10.2", blueprint_id);
    case "T10-DEC-COMPARE": // legacy
      return genDecCompare(seed0, counter, level, "T10.2", blueprint_id);
    case "T10-DEC-ROUND":
      return genDecRound(seed0, counter, level, "T10.3", blueprint_id);

    // Addition decimal
    case "A11-DEC-ALIGN":
      return genDecAdd(seed0, counter, level, "A11.1", blueprint_id, false);

    case "A11-DEC-MIXED-LEN":
      return genDecAddMixedLen(seed0, counter, level, "A11.2", blueprint_id);
    case "A11-DEC-CARRY":
      return genDecAdd(seed0, counter, level, "A11.2", blueprint_id, true);

    // Subtraktion
    case "S0-SUB-LE10":
      return genSubLe10(seed0, counter, level, "S0.1", blueprint_id);
    case "S0-SUB-FROM10":
      return genSubFrom10(seed0, counter, level, "S0.2", blueprint_id);

    // Alias blueprints (backwards compatible ids used in some skillmaps)
    case "S0-FROM10":
      return genSubFrom10(seed0, counter, level, "S0.2", blueprint_id);
    case "S0-SUB-CROSS-TEN":
      return genSubCrossTen(seed0, counter, level, "S0.3", blueprint_id);

    case "S0-CROSS-TEN":
      return genSubCrossTen(seed0, counter, level, "S0.3", blueprint_id);
    case "S1-SUB-2D1D-NOBORROW":
      return genSub2D1D(seed0, counter, level, "S1.1", blueprint_id, false);

    case "S1-2D1D-NOBORROW":
      return genSub2D1D(seed0, counter, level, "S1.2", blueprint_id, false);
    case "S1-2D1D-BORROW":
      return genSub2D1D(seed0, counter, level, "S1.3", blueprint_id, true);
    case "S1-SUB-2D1D-BORROW":
      return genSub2D1D(seed0, counter, level, "S1.2", blueprint_id, true);
    case "S1-SUB-2D2D-NOBORROW":
      return genSub2D2D(seed0, counter, level, "S1.3", blueprint_id, false);

    case "S1-2D2D-NOBORROW":
      return genSub2D2D(seed0, counter, level, "S1.4", blueprint_id, false);
    case "S1-2D2D-BORROW":
      return genSub2D2D(seed0, counter, level, "S1.5", blueprint_id, true);
    case "S1-SUB-2D2D-BORROW":
      return genSub2D2D(seed0, counter, level, "S1.4", blueprint_id, true);
    case "S2-SUB-3D3D-NOBORROW":
      return genSub3D3D(seed0, counter, level, "S2.1", blueprint_id, "none");

    case "S2-3D3D-NOBORROW":
      return genSub3D3D(seed0, counter, level, "S2.1", blueprint_id, "none");
    case "S2-3D3D-BORROW":
      return genSub3D3D(seed0, counter, level, "S2.2", blueprint_id, "borrow");
    case "S2-SUB-3D3D-BORROW":
      return genSub3D3D(seed0, counter, level, "S2.2", blueprint_id, "borrow");
    case "S2-SUB-BORROW-OVER-ZERO":
      return genSub3D3D(seed0, counter, level, "S2.3", blueprint_id, "over_zero");

    case "S2-BORROW-OVER-ZERO":
      return genSub3D3D(seed0, counter, level, "S2.3", blueprint_id, "over_zero");
    case "S-WORD-PROBLEMS":
      return genSubWord(seed0, counter, level, "S-WP.1", blueprint_id);

    // Subtraktion decimal
    case "S11-DEC-ALIGN":
      return genDecSub(seed0, counter, level, "S11.1", blueprint_id, false);
    case "S11-DEC-BORROW":
      return genDecSub(seed0, counter, level, "S11.2", blueprint_id, true);

    // Multiplikation
    case "M0-REPEATED-ADD":
      return genMulRepeatedAdd(seed0, counter, level, "M0.1", blueprint_id);
    case "M0-TIMES-TABLES-0-10":
      return genMulTimesTables(seed0, counter, level, "M0.2", blueprint_id);

    case "M1-TIMES-TABLES-0-10":
      return genMulTimesTables(seed0, counter, level, "M0.2", blueprint_id);
    case "M0-ARRAYS":
      return genMulArrays(seed0, counter, level, "M0.1", blueprint_id);
    case "M1-MUL-BY-10-100-1000":
      return genMulByPow10(seed0, counter, level, "M1.1", blueprint_id);
    case "M1-2Dx1D-NOREGROUP":
      return genMul2Dx1D(seed0, counter, level, "M1.2", blueprint_id, false);
    case "M1-2Dx1D-REGROUP":
      return genMul2Dx1D(seed0, counter, level, "M1.3", blueprint_id, true);
    case "M2-AREA-2Dx1D-EASY":
      return genMulArea2Dx1D(seed0, counter, level, "M2.1", blueprint_id, false);
    case "M2-AREA-2Dx1D-HARD":
      return genMulArea2Dx1D(seed0, counter, level, "M2.2", blueprint_id, true);
    case "M2-REGROUP-TENS":
      return genMul2Dx1D(seed0, counter, level, "M2.3", blueprint_id, true);
    case "M2-REGROUP-HUNDREDS":
      return genMul3Dx1D(seed0, counter, level, "M2.4", blueprint_id);
    case "M3-AREA-2Dx2D":
      return genMulArea2Dx2D(seed0, counter, level, "M3.1", blueprint_id);

    case "M3-AREA-2Dx2D-EASY":
      return genMulArea2Dx2D(seed0, counter, level, "M3.1", blueprint_id);
    case "M3-AREA-2Dx2D-HARD":
      return genMulArea2Dx2D(seed0, counter, level, "M3.2", blueprint_id);
    case "M4-AREA-3Dx2D":
      return genMulArea3Dx2D(seed0, counter, level, "M4.1", blueprint_id);
    case "M-WORD-PROBLEMS":
      return genMulWord(seed0, counter, level, "M-WP.1", blueprint_id);

    // Multiplikation decimal
    case "M11-DEC-TIMES-INT":
      return genDecMulTimesInt(seed0, counter, level, "M11.1", blueprint_id);
    case "M11-DEC-TIMES-DEC":
      return genDecMulTimesDec(seed0, counter, level, "M11.2", blueprint_id);

    // Division
    case "D0-GROUPING-CONCEPT":
      return genDivConcept(seed0, counter, level, "D0.1", blueprint_id);

    case "D0-CONCEPT":
      return genDivConcept(seed0, counter, level, "D0.1", blueprint_id);
    case "D0-DIV-FACTS":
      return genDivTimesTables(seed0, counter, level, "D0.2", blueprint_id, 10);
    case "D0-TIMES-TABLES":
      return genDivTimesTables(seed0, counter, level, "D0.2", blueprint_id, 10);

    case "D1-REM-CONCEPT":
      return genDivRemainderSkill(seed0, counter, level, "D1.1", blueprint_id, false);
    case "D1-REM-CHECK":
      return genDivRemainderSkill(seed0, counter, level, "D1.2", blueprint_id, true);
    case "D1-2D1D-NOREM":
      return genDiv2D1DNoRem(seed0, counter, level, "D1.1", blueprint_id);
    case "D2-LONGDIV-NOREM-2D":
      return genDiv2D1DNoRem(seed0, counter, level, "D2.1", blueprint_id);

    case "D2-LONGDIV-NOREM":
      return genDiv2D1DNoRem(seed0, counter, level, "D2.1", blueprint_id);
    case "D2-LONGDIV-REM":
      return genDiv2D1DRem(seed0, counter, level, "D2.2", blueprint_id);
    case "D2-ZERO-IN-QUOTIENT":
      return genDivZeroInQuotient(seed0, counter, level, "D2.3", blueprint_id);
    case "N1.18-F3-LONGDIV-NOREM":
      return genDivNoRem(seed0, counter, level, "N1.18.1", blueprint_id);
    case "D2-LONGDIV-REM-2D":
      return genDiv2D1DRem(seed0, counter, level, "D2.2", blueprint_id);
    case "D-WORD-PROBLEMS":
      return genDivWord(seed0, counter, level, "D-WP.1", blueprint_id);

    // Division decimal
    case "D11-DIV-BY-10-100-1000":
      return genDivByPow10(seed0, counter, level, "D11.1", blueprint_id);
    case "D11-DEC-DIV-INT":
      return genDecDivByInt(seed0, counter, level, "D11.2", blueprint_id);

    default:
      if (isDev()) {
        console.error('[engine] Unknown blueprint_id', blueprint_id);
        throw new Error(`Unknown blueprint: ${blueprint_id}`);
      }
      // production fallback
      return genDivNoRem(seed0, counter, level, "N1.18.1", blueprint_id);
  }
}

export function createRunner(blueprint_id: BlueprintId, difficulty_level: DifficultyLevel, seed: number): RunnerState {
  return { status: "idle", blueprint_id, difficulty_level, seed, counter: 0 };
}

export function runnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  if (action.type === "NEW_ITEM") {
    const counter = state.counter ?? 0;
    const lvl = action.difficulty_level ?? state.difficulty_level;
    const item = genFromBlueprint(state.blueprint_id, state.seed, counter, lvl);
    return {
      status: "presenting",
      blueprint_id: state.blueprint_id,
      difficulty_level: lvl,
      seed: state.seed,
      counter: counter + 1,
      item,
    };
  }

  if (action.type === "NEXT") {
    return runnerReducer(state, { type: "NEW_ITEM" });
  }

  if (action.type === "SUBMIT") {
    const st: any = state;
    if (st.status !== "presenting") return state;

    const item: ItemInstance = st.item;
    const attempts = Number(action.raw_response?.attempts ?? 1);
    const hints_used = Number(action.raw_response?.hints_used ?? 0);

    let ok = false;
    let error_code: string | undefined = undefined;
    let failed_step_id: string | undefined = undefined;

    if (item.response_kind === "int") {
      const a = action.raw_response?.answer;
      const q = action.raw_response?.quotient;
      const val = Number(a ?? q);

      const work = action.raw_response?.work;

      // NOTE: Area model/kolonneaddition UI is currently disabled in the app.
      // For items that used to include meta.area, we accept a plain integer answer.
      if (item.blueprint_id === "A3-COMPENSATION" && work?.kind === "comp_expr") {
        const t0 = work?.terms?.[0];
        const t1 = work?.terms?.[1];
        const x = Number(t0);
        const y = Number(t1);
        const txt = item.display.kind === "text" ? item.display.text : "";
        ok =
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          x + y === item.correct_answer &&
          isValidCompensationFromText(txt, x, y);
      } else {
        ok = Number.isFinite(val) && val === item.correct_answer;
      }

      if (!ok) {
        error_code = "WRONG_ANSWER";
        failed_step_id = "answer";
      }
    } else if (item.response_kind === "number") {
      const val = Number(action.raw_response?.answer);
      const scale = Number((item as any).scale);
      const correct_scaled = Number((item as any).correct_scaled);

      const scaled = Number.isFinite(val) && Number.isFinite(scale) ? Math.round(val * scale) : NaN;
      ok = Number.isFinite(scaled) && scaled === correct_scaled;

      if (!ok) {
        error_code = "WRONG_ANSWER";
        failed_step_id = "answer";
      }
    } else if (item.response_kind === "mcq") {
      const idx = Math.trunc(Number(action.raw_response?.choice_index));
      ok = Number.isFinite(idx) && idx === item.correct_choice_index;
      if (!ok) {
        error_code = "WRONG_CHOICE";
        failed_step_id = "choice";
      }
    } else if (item.response_kind === "order") {
      const ord = action.raw_response?.order;
      const isArray = Array.isArray(ord);
      ok =
        isArray &&
        ord.length === item.correct_order.length &&
        ord.every((x: unknown, i: number) => Math.trunc(Number(x)) === item.correct_order[i]);

      if (!ok) {
        error_code = "WRONG_ORDER";
        failed_step_id = "order";
      }
    
    } else if (item.response_kind === "column_add") {
      const work = action.raw_response?.work;
      const resDigits = work?.result_digits;
      const carryIn = work?.carry_in;

      const meta: any = (item as any).meta;
      const expRes: number[] = meta?.result_digits ?? [];
      const expCarry: number[] = meta?.carry_in ?? [];
      const n = Number((item as any).n);

      const isArr = Array.isArray(resDigits) && Array.isArray(carryIn);
      ok =
        isArr &&
        resDigits.length === n + 1 &&
        carryIn.length === n &&
        resDigits.every((x: unknown, i: number) => Math.trunc(Number(x)) === expRes[i]) &&
        carryIn.every((x: unknown, i: number) => Math.trunc(Number(x)) === expCarry[i]);

      if (!ok) {
        // Try to give a more precise error code
        error_code = "WRONG_COLUMN_ADD";
        failed_step_id = "column_add";
        if (isArr) {
          for (let i = 0; i < n; i++) {
            if (Math.trunc(Number(carryIn[i])) !== expCarry[i]) {
              error_code = "WRONG_CARRY";
              failed_step_id = `carry_${i}`;
              break;
            }
          }
          for (let i = 0; i < n + 1; i++) {
            if (Math.trunc(Number(resDigits[i])) !== expRes[i]) {
              error_code = "WRONG_RESULT_DIGIT";
              failed_step_id = `digit_${i}`;
              break;
            }
          }
        }
      }
} else {
      const q = Number(action.raw_response?.quotient);
      const r = Number(action.raw_response?.remainder);
      const qOk = Number.isFinite(q) && q === item.correct_quotient;
      const rOk = Number.isFinite(r) && r === item.correct_remainder;

      ok = qOk && rOk;
      if (!qOk && !rOk) {
        error_code = "WRONG_QUOTIENT_AND_REMAINDER";
        failed_step_id = "quotient+remainder";
      } else if (!qOk) {
        error_code = "WRONG_QUOTIENT";
        failed_step_id = "quotient";
      } else if (!rOk) {
        error_code = "WRONG_REMAINDER";
        failed_step_id = "remainder";
      }
    }

    const outcome: "correct" | "incorrect" = ok ? "correct" : "incorrect";

    const feedback: Feedback = ok
      ? { severity: "success", message_key: "correct" }
      : { severity: "error", message_key: "wrong", hint_key: "try_again" };

    const evidence_event: EvidenceEvent = {
      item_id: item.item_id,
      blueprint_id: item.blueprint_id,
      node_id: item.node_id,
      timestamp: isoNow(),
      outcome,
      error_code,
      primary_micro_skills: [`${item.node_id}.a`],
      secondary_micro_skills: [],
      micro_skill_deltas: {},
      attempts,
      hints_used,
      time_ms: 0,
    };

    const last_result: CheckResult = {
      item_id: item.item_id,
      blueprint_id: item.blueprint_id,
      node_id: item.node_id,
      outcome,
      primary_error_code: error_code,
      failed_step_id,
      feedback,
      evidence_event,
    };

    return { ...st, status: "feedback", last_result };
  }

  return state;
}
