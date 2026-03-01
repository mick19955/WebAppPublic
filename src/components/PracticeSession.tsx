import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRunner, runnerReducer, isoNow } from "../engine/engine_v0_1";
import type {
  BlueprintId,
  RunnerState,
  ItemInstance,
  ItemNumber,
  ItemQR,
  ItemMCQ,
  ItemOrder,
} from "../engine/engine_v0_1";
import type { PracticeEvent } from "../progress/types";
import { useProgress } from "../progress/ProgressContext";
import { IRT, chooseLevelFromTheta, levelToB, updateTheta } from "../adaptive/irt";
import { useAudio } from "../audio/AudioContext";
import "./PracticeSession.css";

const MAX_ATTEMPTS_PER_ITEM = 2;

// Spaced retry: failed (not skipped) items reappear later in the SAME session.
const RETRY_GAP = 2; // number of other items between failure and retry

// Delay before advancing after a correct answer (lets the user perceive feedback)
const CORRECT_PAUSE_MS = (() => {
  const raw = (import.meta as any).env?.VITE_CORRECT_PAUSE_MS;
  const n = raw == null ? 700 : Number(raw);
  const base = Number.isFinite(n) ? Math.max(250, Math.min(2000, Math.floor(n))) : 700;
  return (import.meta as any).env?.DEV ? Math.max(base, 1200) : base;
})();

type Props = {
  nodeId: string;
  title?: string;
  blueprintId: BlueprintId;
  level: number;
  adaptive?: boolean;
  seed: number;
  totalItems: number;
  onEvent: (e: PracticeEvent) => void;
  onExit?: () => void;
  onExitSummary?: () => void;
};

type Row = {
  i: number;
  item_id: string;
  prompt: string;
  user_answer: string;
  correct_answer: string;
  correct: boolean;
  skipped: boolean;
};

type RetryEntry = {
  dueAtCompletedCount: number; // retry is eligible when rows.length >= this
  item: ItemInstance;
};

function parseIntOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (!/^-?\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseNumberOrNull(s: string): number | null {
  const t0 = s.trim();
  if (!t0) return null;
  const t = t0.replace(",", ".");
  if (!/^-?(\d+|\d*\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parsePlusExpression(s: string): { x: number; y: number } | null {
  const m = s.trim().match(/^(-?\d+)\s*\+\s*(-?\d+)$/);
  if (!m) return null;
  const x = parseInt(m[1]!, 10);
  const y = parseInt(m[2]!, 10);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function parseAddText(s: string): { a: number; b: number } | null {
  const m = s.match(/(-?\d+)\s*\+\s*(-?\d+)/);
  if (!m) return null;
  const a = parseInt(m[1]!, 10);
  const b = parseInt(m[2]!, 10);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}

function Fraction({ num, den }: { num: number; den: number }) {
  return (
    <span className="frac" aria-label={`${num} over ${den}`}>
      <span className="fracTop">{num}</span>
      <span className="fracBar" />
      <span className="fracBot">{den}</span>
    </span>
  );
}

function NumberLineMove({
  start,
  delta,
  steps,
  min,
  max,
}: {
  start: number;
  delta: number;
  steps: number;
  min: number;
  max: number;
}) {
  const W = 560;
  const H = 110;
  const PAD = 28;

  const range = Math.max(1, max - min);
  const xOf = (n: number) => PAD + ((n - min) / range) * (W - 2 * PAD);
  const yAxis = 64;

  const x0 = xOf(start);
  const x1 = xOf(start + delta);

  const arrowY = 36;
  const head = 10;
  const dir = x1 >= x0 ? 1 : -1;
  const label = `${delta >= 0 ? "+" : "−"}${Math.abs(delta)}`;

  const tickValues: number[] = [];
  for (let v = min; v <= max; v++) tickValues.push(v);

  const shouldLabelTick = (v: number) => {
    if (v === 0 || v === start) return true;
    const span = max - min;
    if (span <= 12) return true;
    if (span <= 18) return v % 2 === 0;
    return v % 5 === 0;
  };

  return (
    <div className="numberLineWrap" aria-label="Tallinje">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img">
        <line x1={PAD} y1={yAxis} x2={W - PAD} y2={yAxis} stroke="#0f172a" strokeWidth={2} />

        {tickValues.map((v) => {
          const x = xOf(v);
          const isMajor = v === 0 || v === start || v === start + delta;
          const tH = isMajor ? 12 : 8;
          return (
            <g key={v}>
              <line
                x1={x}
                y1={yAxis - tH}
                x2={x}
                y2={yAxis + tH}
                stroke="#0f172a"
                strokeWidth={isMajor ? 2 : 1}
              />
              {shouldLabelTick(v) && (
                <text x={x} y={yAxis + 30} textAnchor="middle" fontSize={12} fill="#334155" fontWeight={800}>
                  {v}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={x0}
          y1={arrowY}
          x2={x1 - dir * head}
          y2={arrowY}
          stroke="#4f7cff"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <polygon
          points={`${x1},${arrowY} ${x1 - dir * head},${arrowY - 6} ${x1 - dir * head},${arrowY + 6}`}
          fill="#4f7cff"
        />
        <text x={(x0 + x1) / 2} y={arrowY - 10} textAnchor="middle" fontSize={14} fill="#1d4ed8" fontWeight={900}>
          {label} ({steps})
        </text>

        <circle cx={x0} cy={yAxis} r={8} fill="#0f172a" />
        <text x={x0} y={yAxis - 16} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={900}>
          {start}
        </text>

        <circle cx={x1} cy={yAxis} r={9} fill="#fff" stroke="#0f172a" strokeWidth={2} />
        <text x={x1} y={yAxis - 16} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={900}>
          ?
        </text>
      </svg>
    </div>
  );
}

function MCQChoices({
  item,
  choice,
  setChoice,
  disabled,
  firstRef,
}: {
  item: ItemMCQ;
  choice: number | null;
  setChoice: (n: number) => void;
  disabled?: boolean;
  firstRef?: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <div className="mcqList" role="radiogroup" aria-label="Svarmuligheder">
      {item.choices.map((c, i) => {
        const selected = choice === i;
        return (
          <button
            key={i}
            ref={i === 0 ? firstRef : undefined}
            type="button"
            className={`mcqOption ${selected ? "selected" : ""}`}
            aria-checked={selected}
            role="radio"
            disabled={disabled}
            onClick={() => setChoice(i)}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

function OrderDragList({
  item,
  order,
  setOrder,
  disabled,
  firstRef,
}: {
  item: ItemOrder;
  order: number[];
  setOrder: (o: number[]) => void;
  disabled?: boolean;
  firstRef?: React.RefObject<HTMLDivElement>;
}) {
  const [dragPos, setDragPos] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = order.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    setOrder(next);
  };

  return (
    <div className="orderWrap" aria-label="Træk og slip rækkefølge">
      <div className="orderHint">Træk elementerne, så de står i stigende orden.</div>
      <div className="orderList" role="list">
        {order.map((idx, pos) => {
          const v = item.values[idx] ?? "";
          return (
            <div
              key={`${idx}-${pos}`}
              ref={pos === 0 ? firstRef : undefined}
              className="orderItem"
              role="listitem"
              tabIndex={0}
              aria-label={`Element ${pos + 1}: ${v}`}
              draggable={!disabled}
              onDragStart={(e) => {
                if (disabled) return;
                setDragPos(pos);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(pos));
              }}
              onDragOver={(e) => {
                if (disabled) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (disabled) return;
                e.preventDefault();
                const from = dragPos ?? Number(e.dataTransfer.getData("text/plain"));
                if (!Number.isFinite(from)) return;
                move(from, pos);
                setDragPos(null);
              }}
              onDragEnd={() => setDragPos(null)}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (pos > 0) move(pos, pos - 1);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (pos < order.length - 1) move(pos, pos + 1);
                }
              }}
            >
              <div className="orderHandle" aria-hidden="true">
                ≡
              </div>
              <div className="orderVal">{v}</div>
              <div className="orderArrows" aria-hidden="true">
                <button
                  type="button"
                  className="orderArrow"
                  disabled={disabled || pos === 0}
                  tabIndex={-1}
                  onClick={() => move(pos, pos - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="orderArrow"
                  disabled={disabled || pos === order.length - 1}
                  tabIndex={-1}
                  onClick={() => move(pos, pos + 1)}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 17a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 19zm1.2-5.6c-.7.5-.9.8-.9 1.6h-1.8c0-1.4.5-2.1 1.6-2.9.8-.6 1.2-1 1.2-1.8a1.6 1.6 0 0 0-3.2 0H8.3a3.4 3.4 0 1 1 6.8 0c0 1.7-.9 2.5-1.9 3.1z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"
        fill="currentColor"
      />
    </svg>
  );
}

type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
};

function Confetti({ active, durationMs = 4200 }: { active: boolean; durationMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const particlesRef = useRef<ConfettiParticle[]>([]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ef4444", "#eab308"];

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const spawn = () => {
      const n = 160;
      const w = window.innerWidth;
      particlesRef.current = Array.from({ length: n }, () => {
        const size = 6 + Math.random() * 8;
        return {
          x: Math.random() * w,
          y: -20 - Math.random() * 240,
          vx: (Math.random() - 0.5) * 2.6,
          vy: 2.2 + Math.random() * 3.2,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.25,
          size,
          color: colors[Math.floor(Math.random() * colors.length)]!,
        };
      });
    };

    spawn();

    startRef.current = performance.now();
    const tick = (t: number) => {
      const elapsed = t - startRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      const ps = particlesRef.current;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        p.rot += p.vr;

        if (p.y > h + 40) {
          p.y = -20 - Math.random() * 180;
          p.x = Math.random() * w;
          p.vy = 2.2 + Math.random() * 3.2;
        }
        if (p.x < -40) p.x = w + 40;
        if (p.x > w + 40) p.x = -40;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (elapsed < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, durationMs]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
}

function promptString(item: ItemInstance): string {
  const anyItem: any = item as any;
  const nl = anyItem?.meta?.numberline;
  if (nl && typeof nl.start === "number" && typeof nl.delta === "number") {
    const sign = nl.delta >= 0 ? "+" : "−";
    return `Tallinje: ${nl.start} ${sign} ${Math.abs(nl.delta)}`;
  }

  if (item.display.kind === "fraction") return `${item.display.num} ÷ ${item.display.den}`;
  return item.display.text;
}

function formatNumberCorrect(item: ItemNumber): string {
  const scale = item.scale;
  const v = item.correct_scaled / scale;

  const dp = Number.isFinite(scale) && scale > 1 ? Math.max(0, Math.round(Math.log10(scale))) : 0;
  if (!Number.isFinite(v)) return String(v);
  if (dp <= 0) return String(Math.round(v));
  return v.toFixed(dp);
}

function correctString(item: ItemInstance): string {
  if (item.response_kind === "int") return String(item.correct_answer);
  if (item.response_kind === "number") return formatNumberCorrect(item as ItemNumber);
  if (item.response_kind === "mcq") {
    const mcq = item as ItemMCQ;
    return mcq.choices[mcq.correct_choice_index] ?? "";
  }
  if (item.response_kind === "order") {
    const o = item as ItemOrder;
    return o.correct_order.map((i) => o.values[i] ?? "").join(", ");
  }
  if (item.response_kind === "quotient_remainder") {
    const qr = item as ItemQR;
    return `${qr.correct_quotient} (rest ${qr.correct_remainder})`;
  }
  return "";
}

function forcePresentingSameItem(prev: RunnerState): RunnerState {
  const anyPrev: any = prev as any;
  if (!anyPrev?.item) return prev;
  if (prev.status !== "feedback") return prev;
  return {
    status: "presenting",
    blueprint_id: anyPrev.blueprint_id,
    difficulty_level: anyPrev.difficulty_level,
    seed: anyPrev.seed,
    counter: anyPrev.counter,
    item: anyPrev.item,
  } as any;
}

function DigitBox({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <input
      className="digitBox"
      value={value}
      disabled={disabled}
      inputMode="numeric"
      autoComplete="off"
      aria-label={ariaLabel}
      onChange={(e) => {
        const t = e.target.value;
        const c = t.replace(/\D/g, "").slice(-1);
        onChange(c);
      }}
      onKeyDown={(e) => {
        if (e.key === " ") e.preventDefault();
      }}
    />
  );
}

function ColumnAdditionWork({
  a,
  b,
  ans,
  setAns,
  carry,
  setCarry,
  disabled,
}: {
  a: number;
  b: number;
  ans: string[];
  setAns: (v: string[]) => void;
  carry: string[];
  setCarry: (v: string[]) => void;
  disabled?: boolean;
}) {
  const L = ans.length;
  const aStr = String(a).padStart(L, " ");
  const bStr = String(b).padStart(L, " ");

  return (
    <div className="colAdd" role="group" aria-label="Skriftlig addition">
      <div className="colRow carryRow" style={{ gridTemplateColumns: `24px repeat(${L}, 34px)` }}>
        <div />
        {Array.from({ length: L }).map((_, i) => (
          <DigitBox
            key={i}
            value={carry[i] ?? ""}
            disabled={disabled}
            ariaLabel={`Mente kolonne ${i + 1}`}
            onChange={(v) => {
              const next = carry.slice();
              next[i] = v;
              setCarry(next);
            }}
          />
        ))}
      </div>

      <div className="colRow" style={{ gridTemplateColumns: `24px repeat(${L}, 34px)` }}>
        <div />
        {Array.from({ length: L }).map((_, i) => (
          <div key={i} className="digitStatic">
            {aStr[i] === " " ? "" : aStr[i]}
          </div>
        ))}
      </div>

      <div className="colRow" style={{ gridTemplateColumns: `24px repeat(${L}, 34px)` }}>
        <div className="plus">+</div>
        {Array.from({ length: L }).map((_, i) => (
          <div key={i} className="digitStatic">
            {bStr[i] === " " ? "" : bStr[i]}
          </div>
        ))}
      </div>

      <div className="colLine" />

      <div className="colRow" style={{ gridTemplateColumns: `24px repeat(${L}, 34px)` }}>
        <div />
        {Array.from({ length: L }).map((_, i) => (
          <DigitBox
            key={i}
            value={ans[i] ?? ""}
            disabled={disabled}
            ariaLabel={`Svarciffer kolonne ${i + 1}`}
            onChange={(v) => {
              const next = ans.slice();
              next[i] = v;
              setAns(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AreaModelWork({
  area,
  inputs,
  setInputs,
  disabled,
}: {
  area: any;
  inputs: string[][];
  setInputs: (v: string[][]) => void;
  disabled?: boolean;
}) {
  const aParts: number[] = area?.a_parts ?? [];
  const bParts: number[] = area?.b_parts ?? [];
  const rows = bParts.length;
  const cols = aParts.length;

  const sum = useMemo(() => {
    let s = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const n = parseIntOrNull(inputs?.[i]?.[j] ?? "");
        if (typeof n === "number") s += n;
      }
    }
    return s;
  }, [inputs, rows, cols]);

  return (
    <div className="areaWrap" role="group" aria-label="Arealmodel delprodukter">
      <div className="areaMeta">
        <div className="muted small">Arealmetode: udfyld delprodukterne</div>
        <div className="muted small">
          Sum: <b>{Number.isFinite(sum) ? sum : "—"}</b>
        </div>
      </div>

      <div className="areaGrid" style={{ gridTemplateColumns: `72px repeat(${cols}, minmax(74px, 1fr))` }}>
        <div className="areaCorner" />
        {aParts.map((ap, j) => (
          <div key={j} className="areaHead">
            {ap}
          </div>
        ))}

        {bParts.map((bp, i) => (
          <React.Fragment key={i}>
            <div className="areaSide">{bp}</div>
            {aParts.map((_, j) => (
              <input
                key={j}
                className="areaCell"
                value={inputs?.[i]?.[j] ?? ""}
                disabled={disabled}
                inputMode="numeric"
                autoComplete="off"
                aria-label={`Delprodukt række ${i + 1} kolonne ${j + 1}`}
                onChange={(e) => {
                  const t = e.target.value.replace(/\D/g, "");
                  const next = inputs.map((r) => r.slice());
                  next[i]![j] = t;
                  setInputs(next);
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function explainForBlueprint(item: ItemInstance, userAns?: { q?: number | null; r?: number | null }) {
  const bp = String(item.blueprint_id);

  if (item.meta?.area) {
    return "Arealmetode: udfyld alle delprodukter (fx tiere og enere) og summér dem.";
  }

  if (item.response_kind === "quotient_remainder") {
    const qr = item as ItemQR;
    const r = userAns?.r;
    if (typeof r === "number" && Number.isFinite(r) && r >= qr.divisor) {
      return "Husk: resten skal være mindre end divisoren.";
    }
    return "Husk: kvotient og rest (resten er det, der er tilbage).";
  }

  // Borrow/carry hints by blueprint id
  if (bp.includes("NOBORROW")) return "Ingen lån: træk cifrene fra uden at ombytte tiere/hundreder.";
  if (bp.includes("BORROW") || bp.includes("CROSS") || bp.includes("OVER-ZERO"))
    return "Lån: ombyt én tier/hundrede til 10 enere/10 tiere før du trækker fra.";
  if (bp.includes("NOCARRY")) return "Ingen mente: summer cifrene uden at sende 1 videre.";
  if (bp.includes("CARRY"))
    return "Mente: når en sum bliver 10 eller mere, sender du 1 videre til næste kolonne.";

  if (bp.includes("DEC")) return "Stil komma under komma. Du må gerne skrive med komma eller punktum.";
  return undefined;
}

export default function PracticeSession(props: Props) {
  const { progress } = useProgress();
  const { audio, prime } = useAudio();

  // --- Micro-interaction sounds ---

  const safePlay = (name: Parameters<typeof audio.play>[0]) => {
    void prime();        // unlock/resume AudioContext (no-op efter første gang)
    audio.play(name);
  };

  const playTap = () => safePlay("tap");


  // Ensure session-complete sound plays only once per session run
  const endSoundPlayedRef = useRef(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const remRef = useRef<HTMLInputElement | null>(null);

  // IMPORTANT: non-nullable generic so it matches `ref` prop types
  const mcqFirstRef = useRef<HTMLButtonElement>(null!);
  const orderFirstRef = useRef<HTMLDivElement>(null!);

  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const retryBtnRef = useRef<HTMLButtonElement | null>(null);

  const startMasteryRef = useRef<number>(progress.nodes[props.nodeId]?.mastery ?? 0);

  const storedTheta = progress.nodes[props.nodeId]?.theta;
  const [theta, setTheta] = useState<number>(() =>
    typeof storedTheta === "number" && Number.isFinite(storedTheta) ? storedTheta : IRT.initialTheta
  );

  const [st, setSt] = useState<RunnerState>(() => createRunner(props.blueprintId, props.level, props.seed));

  // Main answer inputs
  const [answer, setAnswer] = useState("");
  const [remainder, setRemainder] = useState("");

  // Interactive response kinds
  const [mcqChoice, setMcqChoice] = useState<number | null>(null);
  const [order, setOrder] = useState<number[]>([]);

  // Column-work (A3.*)
  const [colAns, setColAns] = useState<string[]>([]);
  const [colCarry, setColCarry] = useState<string[]>([]);

  // Area model inputs (rows=b_parts, cols=a_parts)
  const [areaInputs, setAreaInputs] = useState<string[][]>([]);

  // Session tracking
  const [rows, setRows] = useState<Row[]>([]);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS_PER_ITEM);
  const [showHelp, setShowHelp] = useState(false);

  const [banner, setBanner] = useState<null | { kind: "ok" | "bad"; title: string; body?: string }>(null);
  const [bannerPulse, setBannerPulse] = useState(0);

  const [holdForNext, setHoldForNext] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // Retry queue (spaced retry)
  const [retryQueue, setRetryQueue] = useState<RetryEntry[]>([]);
  const [isRetry, setIsRetry] = useState(false);

  const lastPromptRef = useRef<string | null>(null);
  const rerollGuardRef = useRef<number>(0);
  // Timestamp of when the current "ok" banner was shown. Used to keep it visible
  // for at least CORRECT_PAUSE_MS even when the item-change effect fires.
  const bannerShownAtRef = useRef<number>(0);

  const item: ItemInstance | null =
    st.status === "presenting" || st.status === "feedback" ? ((st as any).item as ItemInstance) : null;

  const attemptsUsed = MAX_ATTEMPTS_PER_ITEM - attemptsLeft;

  const columnMode =
    item?.blueprint_id === "A3-COL2D-NOCARRY" ||
    item?.blueprint_id === "A3-COL2D-CARRY1" ||
    item?.blueprint_id === "A3-COL2D_CARRY2" ||
    item?.blueprint_id === "A3-COL2D-CARRY2";

  const compMode = item?.blueprint_id === "A3-COMPENSATION";
  const areaMode = !!item?.meta?.area;
  const numberLine: any = (item as any)?.meta?.numberline;

  const operands = useMemo(() => {
    if (!item || item.display.kind !== "text") return null;
    return parseAddText(item.display.text);
  }, [item?.item_id]);

  useEffect(() => {
    const level = props.adaptive === false ? props.level : chooseLevelFromTheta(theta);
    setSt((prev) => runnerReducer(prev, { type: "NEW_ITEM", difficulty_level: level }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rows.length > 0) return;
    if (typeof storedTheta !== "number" || !Number.isFinite(storedTheta)) return;
    setTheta(storedTheta);
  }, [storedTheta, rows.length]);

  // Avoid identical prompts in a row (non-retry only)
  useEffect(() => {
    if (!item) return;

    const p = promptString(item);

    if (!isRetry && lastPromptRef.current && p === lastPromptRef.current && rerollGuardRef.current < 8) {
      rerollGuardRef.current += 1;
      const level = props.adaptive === false ? props.level : chooseLevelFromTheta(theta);
      setSt((prev) => runnerReducer(prev, { type: "NEW_ITEM", difficulty_level: level }));
      return;
    }

    rerollGuardRef.current = 0;
    lastPromptRef.current = p;

    // reset per item
    setAnswer("");
    setRemainder("");
    setAttemptsLeft(MAX_ATTEMPTS_PER_ITEM);
    setShowHelp(false);
    // Only clear the banner if it hasn't just been shown as a correct-answer confirmation.
    // If it was shown very recently, let the scheduled setTimeout clear it instead.
    const age = performance.now() - bannerShownAtRef.current;
    if (age > CORRECT_PAUSE_MS) {
      setBanner(null);
    }
    setHoldForNext(false);

    // interactive kinds
    setMcqChoice(null);
    if (item.response_kind === "order") {
      setOrder((item as ItemOrder).values.map((_, i) => i));
    } else {
      setOrder([]);
    }

    // column-work state
    if (columnMode && item.response_kind === "int") {
      const L = String(item.correct_answer).length;
      setColAns(Array.from({ length: L }, () => ""));
      setColCarry(Array.from({ length: L }, () => ""));
    } else {
      setColAns([]);
      setColCarry([]);
    }

    // area model state
    if (areaMode) {
      const aParts: number[] = (item as any).meta?.area?.a_parts ?? [];
      const bParts: number[] = (item as any).meta?.area?.b_parts ?? [];
      setAreaInputs(bParts.map(() => aParts.map(() => "")));
    } else {
      setAreaInputs([]);
    }

    setTimeout(() => {
      if (item.response_kind === "mcq") {
        mcqFirstRef.current?.focus();
        return;
      }
      if (item.response_kind === "order") {
        orderFirstRef.current?.focus();
        return;
      }
      if (item.response_kind === "int" && !columnMode && !areaMode) {
        inputRef.current?.focus();
        return;
      }
      if (item.response_kind === "number") {
        inputRef.current?.focus();
        return;
      }
      if (item.response_kind === "quotient_remainder") {
        inputRef.current?.focus();
      }
    }, 0);
  }, [item?.item_id, isRetry, props.adaptive, props.level, theta, columnMode, areaMode]);

  function recordRow(r: Omit<Row, "i">) {
    setRows((prev) => [...prev, { ...r, i: prev.length }]);
  }

  function emitEvent(e: PracticeEvent) {
    props.onEvent(e);
  }

  function makePresentingWithItem(base: RunnerState, it: ItemInstance): RunnerState {
    const b: any = base as any;
    return {
      status: "presenting",
      blueprint_id: b?.blueprint_id ?? props.blueprintId,
      difficulty_level: (it as any).difficulty_level ?? b?.difficulty_level ?? props.level,
      seed: b?.seed ?? props.seed,
      counter: b?.counter ?? 0,
      item: it,
    } as any;
  }

  function scheduleRetry(failedItem: ItemInstance) {
    if (isRetry) return; // no retry-of-retry
    if (rows.length + 1 >= props.totalItems) return; // no room left in session

    const completedAfterThis = rows.length + 1;
    const dueAt = Math.min(completedAfterThis + RETRY_GAP, props.totalItems - 1);

    setRetryQueue((prev) => {
      if (prev.some((x) => x.item.item_id === failedItem.item_id)) return prev;
      return [...prev, { dueAtCompletedCount: dueAt, item: failedItem }];
    });
  }

  function advanceToNext(afterState: RunnerState, thetaForSelection: number = theta) {
    if (rows.length >= props.totalItems) return;

    const due = retryQueue
      .slice()
      .sort((a, b) => a.dueAtCompletedCount - b.dueAtCompletedCount)
      .find((x) => x.dueAtCompletedCount <= rows.length);

    if (due) {
      setRetryQueue((prev) => prev.filter((x) => x.item.item_id !== due.item.item_id));
      setIsRetry(true);
      setSt(makePresentingWithItem(afterState, due.item));
      return;
    }

    setIsRetry(false);
    const level = props.adaptive === false ? props.level : chooseLevelFromTheta(thetaForSelection);
    setSt(runnerReducer(afterState, { type: "NEW_ITEM", difficulty_level: level }));
  }

  const finished = rows.length >= props.totalItems;
  const correctCount = useMemo(() => rows.filter((r) => r.correct).length, [rows]);

  // Play session end sound once
  useEffect(() => {
    if (!finished) return;
    if (endSoundPlayedRef.current) return;
    endSoundPlayedRef.current = true;

    safePlay("complete");
    if (correctCount === props.totalItems) safePlay("streak");
  }, [finished, correctCount, props.totalItems, audio]);

  useEffect(() => {
    if (!finished) return;
    if (correctCount !== props.totalItems) return;

    setConfettiActive(true);
    const t = window.setTimeout(() => setConfettiActive(false), 4500);
    return () => window.clearTimeout(t);
  }, [finished, correctCount, props.totalItems]);

  function nextClick() {
    if (!holdForNext) return;
    setHoldForNext(false);
    advanceToNext(st);
  }

  useEffect(() => {
    if (!holdForNext) return;

    setTimeout(() => nextBtnRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        nextClick();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [holdForNext, st]);

  // Summary: Enter triggers "Prøv igen"
  useEffect(() => {
    if (!finished) return;

    setTimeout(() => retryBtnRef.current?.focus(), 0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        retryBtnRef.current?.click();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished]);

  function buildUserAnswerString(it: ItemInstance) {
    if (it.response_kind === "mcq") {
      if (mcqChoice === null) return "";
      return (it as ItemMCQ).choices[mcqChoice] ?? "";
    }
    if (it.response_kind === "order") {
      if (!order.length) return "";
      return order.map((i) => (it as ItemOrder).values[i] ?? "").join(", ");
    }
    if (it.response_kind === "quotient_remainder") return `${answer.trim()} (rest ${remainder.trim()})`;
    if (it.response_kind === "number") return answer.trim();
    if (columnMode) return colAns.join("");
    if (areaMode) return "Arealmodel";
    return answer.trim();
  }

  function submit() {
    if (!item) return;
    if (finished) return;
    if (holdForNext) return;

    let baseState: RunnerState = st;
    if (baseState.status === "feedback" && attemptsLeft > 0) {
      baseState = forcePresentingSameItem(baseState);
    }
    if (baseState.status !== "presenting") return;

    const started_at = isoNow();
    const submitted_at = isoNow();
    const attemptNo = MAX_ATTEMPTS_PER_ITEM - attemptsLeft + 1;

    const raw_response: any = {
      item_id: item.item_id,
      started_at,
      submitted_at,
      attempts: attemptNo,
      hints_used: 0,
    };

    if (item.response_kind === "mcq") {
      if (mcqChoice === null) return;
      raw_response.choice_index = mcqChoice;
    } else if (item.response_kind === "order") {
      if (!order.length || order.length !== (item as ItemOrder).values.length) return;
      raw_response.order = order;
    } else if (item.response_kind === "int") {
      if (areaMode) {
        const rowsN = areaInputs.length;
        const colsN = areaInputs[0]?.length ?? 0;
        if (!rowsN || !colsN) return;
        for (let i = 0; i < rowsN; i++) for (let j = 0; j < colsN; j++) if (!areaInputs[i]![j]!.trim()) return;

        const cells: number[][] = areaInputs.map((r) => r.map((x) => parseInt(x, 10)));
        if (cells.some((r) => r.some((n) => !Number.isFinite(n)))) return;

        const sum = cells.flat().reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);

        raw_response.answer = sum;
        raw_response.work = { kind: "area_model", cells };
      } else if (columnMode) {
        if (!colAns.length || colAns.some((d) => d.trim() === "")) return;
        const val = parseInt(colAns.join(""), 10);
        if (!Number.isFinite(val)) return;
        raw_response.answer = val;
        raw_response.work = { kind: "column_add", ans_digits: colAns, carry_digits: colCarry };
      } else if (compMode && answer.includes("+")) {
        const ex = parsePlusExpression(answer);
        if (!ex) return;
        raw_response.answer = ex.x + ex.y;
        raw_response.work = { kind: "comp_expr", terms: [ex.x, ex.y] };
      } else {
        const a = parseIntOrNull(answer);
        if (a === null) return;
        raw_response.answer = a;
        raw_response.quotient = a; // backwards compat
      }
    } else if (item.response_kind === "number") {
      const v = parseNumberOrNull(answer);
      if (v === null) return;
      raw_response.answer = v;
    } else {
      const q = parseIntOrNull(answer);
      const r = parseIntOrNull(remainder);
      if (q === null || r === null) return;
      raw_response.quotient = q;
      raw_response.remainder = r;
    }

    const nextState = runnerReducer(baseState, { type: "SUBMIT", raw_response });
    setSt(nextState);

    const lr: any = (nextState as any).last_result;
    const outcome = lr?.outcome as "correct" | "incorrect" | undefined;
    const ev = lr?.evidence_event as any;

    const b = levelToB((item as any).difficulty_level);
    const nodeB = levelToB(props.level);

    if (outcome === "correct") {
      setBanner({ kind: "ok", title: "Korrekt" });
      setBannerPulse((p) => p + 1);
      bannerShownAtRef.current = performance.now();
      setTimeout(() => safePlay("correct"), 30);

      const nextTheta = updateTheta(theta, b, 1);
      setTheta(nextTheta);

      recordRow({
        item_id: item.item_id,
        prompt: promptString(item),
        user_answer: buildUserAnswerString(item),
        correct_answer: correctString(item),
        correct: true,
        skipped: false,
      });

      emitEvent({
        event_id: crypto.randomUUID(),
        timestamp: isoNow(),
        node_id: props.nodeId,
        blueprint_id: String(item.blueprint_id),
        item_id: item.item_id,
        outcome: "correct",
        node_level: props.level,
        node_b: nodeB,
        item_level: (item as any).difficulty_level,
        item_b: b,
      });

      setTimeout(() => {
        advanceToNext(nextState, nextTheta);
        // Clear the banner after the new item has rendered
        setTimeout(() => setBanner(null), 400);
      }, CORRECT_PAUSE_MS);
      return;
    }

    // incorrect
    const left = attemptsLeft - 1;
    setAttemptsLeft(left);

    const hint = explainForBlueprint(item, {
      q: parseIntOrNull(answer),
      r: parseIntOrNull(remainder),
    });

    if (left > 0) {
      setBanner({ kind: "bad", title: "Prøv igen", body: hint });
      safePlay("incorrect");
      setTimeout(() => {
        if (item.response_kind === "mcq") {
          mcqFirstRef.current?.focus();
          return;
        }
        if (item.response_kind === "order") {
          orderFirstRef.current?.focus();
          return;
        }
        if (item.response_kind === "quotient_remainder") {
          remRef.current?.focus();
          return;
        }
        inputRef.current?.focus();
      }, 0);
      return;
    }

    // 2. forkert: vis facit, schedule spaced retry, og vent på "Næste"
    scheduleRetry(item);

    setBanner({
      kind: "bad",
      title: "Forkert",
      body: `${hint ? hint + " " : ""}Rigtigt svar: ${correctString(item)}`,
    });
    safePlay("incorrect");

    const nextTheta = updateTheta(theta, b, 0);
    setTheta(nextTheta);

    recordRow({
      item_id: item.item_id,
      prompt: promptString(item),
      user_answer: buildUserAnswerString(item),
      correct_answer: correctString(item),
      correct: false,
      skipped: false,
    });

    emitEvent({
      event_id: crypto.randomUUID(),
      timestamp: isoNow(),
      node_id: props.nodeId,
      blueprint_id: String(item.blueprint_id),
      item_id: item.item_id,
      outcome: "incorrect",
      node_level: props.level,
      node_b: nodeB,
      error_code: ev?.error_code ?? "WRONG",
      item_level: (item as any).difficulty_level,
      item_b: b,
    });

    setHoldForNext(true);
  }

  function skip() {
    if (!item) return;
    if (finished) return;

    setAttemptsLeft(0);

    const hint = explainForBlueprint(item);
    setBanner({
      kind: "bad",
      title: "Sprunget over",
      body: `${hint ? hint + " " : ""}Rigtigt svar: ${correctString(item)}`,
    });

    const b = levelToB((item as any).difficulty_level);
    const nodeB = levelToB(props.level);
    const nextTheta = updateTheta(theta, b, 0);
    setTheta(nextTheta);

    recordRow({
      item_id: item.item_id,
      prompt: promptString(item),
      user_answer: "—",
      correct_answer: correctString(item),
      correct: false,
      skipped: true,
    });

    emitEvent({
      event_id: crypto.randomUUID(),
      timestamp: isoNow(),
      node_id: props.nodeId,
      blueprint_id: String(item.blueprint_id),
      item_id: item.item_id,
      outcome: "skipped",
      node_level: props.level,
      node_b: nodeB,
      item_level: (item as any).difficulty_level,
      item_b: b,
    });

    // IMPORTANT: skip must NOT create a retry.
    setHoldForNext(true);
  }

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  const progressText = `${Math.min(rows.length + 1, props.totalItems)} af ${props.totalItems}`;
  const progressFillPct = (Math.min(rows.length, props.totalItems) / props.totalItems) * 100;

  const helpText =
    item?.meta?.area
      ? "Udfyld delprodukterne i arealmodellen og tryk Svar."
      : item?.response_kind === "mcq"
      ? "Vælg et svar og tryk Svar."
      : item?.response_kind === "order"
      ? "Træk og slip tallene i den rigtige rækkefølge og tryk Svar."
      : item?.response_kind === "quotient_remainder"
      ? "Skriv kvotient og rest (to felter) og tryk Enter."
      : item?.response_kind === "number"
      ? "Skriv et decimaltal (komma eller punktum) og tryk Enter."
      : compMode
      ? "Skriv svaret som et tal, eller vis kompensation (fx 80+26), og tryk Enter."
      : "Skriv dit svar som et helt tal og tryk Enter.";

  const areaReady = useMemo(() => {
    if (!areaMode) return true;
    const r = areaInputs.length;
    const c = areaInputs[0]?.length ?? 0;
    if (!r || !c) return false;
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        if (!areaInputs[i]![j]!.trim()) return false;
      }
    }
    return true;
  }, [areaMode, areaInputs]);

  const columnReady = useMemo(() => {
    if (!columnMode) return true;
    return colAns.length > 0 && colAns.every((d) => d.trim() !== "");
  }, [columnMode, colAns]);

  const canSubmit = useMemo(() => {
    if (!item) return false;
    if (finished) return false;
    if (holdForNext) return false;

    if (item.response_kind === "mcq") return mcqChoice !== null;
    if (item.response_kind === "order") return order.length === (item as ItemOrder).values.length && order.length > 0;

    if (item.response_kind === "quotient_remainder") return !!answer.trim() && !!remainder.trim();
    if (item.response_kind === "number") return !!answer.trim();

    if (areaMode) return areaReady;
    if (columnMode) return columnReady;
    return !!answer.trim();
  }, [item, finished, holdForNext, mcqChoice, order, answer, remainder, areaMode, areaReady, columnMode, columnReady]);

  const beforePct = Math.round((startMasteryRef.current ?? 0) * 100);
  const afterPct = Math.round(((progress.nodes[props.nodeId]?.mastery ?? 0) as number) * 100);

  function retry() {
    endSoundPlayedRef.current = false;

    setRows([]);
    setRetryQueue([]);
    setIsRetry(false);
    setConfettiActive(false);
    startMasteryRef.current = progress.nodes[props.nodeId]?.mastery ?? startMasteryRef.current;

    const seed = Math.floor(Math.random() * 1e9);
    const level = props.adaptive === false ? props.level : chooseLevelFromTheta(theta);
    setSt(createRunner(props.blueprintId, level, seed));
    setTimeout(() => setSt((p) => runnerReducer(p, { type: "NEW_ITEM", difficulty_level: level })), 0);
  }

  const onExitClick = () => {
    if (finished) {
      (props.onExitSummary ?? props.onExit)?.();
    } else {
      props.onExit?.();
    }
  };

  return (
    <div className="sessionPage">
      <Confetti active={confettiActive} durationMs={4500} />

      <div className="topRow">
        <div className="pill">
          <div className="pillIcon">#</div>
          <div className="pillText">Træn</div>
          <div className="pillCount">{progressText}</div>
          <div className="pillBar">
            <div className="pillFill" style={{ width: `${progressFillPct}%` }} />
          </div>
        </div>

        <button
          className="iconBtn"
          aria-label="Luk"
          onPointerDown={playTap}
          onClick={onExitClick}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="title">{props.title ?? "Træning"}</div>

      <div className="card">
        {finished ? (
          <div className="summary">
            <div className="summaryHead">
              <div className="summaryTitle">Oversigt</div>
              <div className="summaryMeta">
                {correctCount} / {props.totalItems} rigtige
              </div>
            </div>

            <div className="deltaBox">
              <div className="deltaRow">
                <div className="muted">Mastery</div>
                <div>
                  <b>{beforePct}%</b> → <b>{afterPct}%</b>
                </div>
              </div>
              <div className="meter deltaMeter">
                <div className="meterFill before" style={{ width: `${beforePct}%` }} />
                <div className="meterFill after" style={{ width: `${afterPct}%` }} />
              </div>
            </div>

            <div className="summaryList">
              {rows.map((r, k) => {
                const status = r.correct ? "Rigtig" : r.skipped ? "Sprunget over" : "Forkert";
                return (
                  <div key={k} className={`sumRow ${r.correct ? "ok" : "bad"}`}>
                    <div className="sumLeft">
                      <div className="sumIdx">{k + 1}</div>
                      <div className="sumProb">{r.prompt}</div>
                    </div>
                    <div className="sumMid">
                      <div className="sumLabel">Dit svar</div>
                      <div className="sumVal">{r.user_answer || "—"}</div>
                    </div>
                    <div className="sumMid">
                      <div className="sumLabel">Rigtigt svar</div>
                      <div className="sumVal">{r.correct_answer}</div>
                    </div>
                    <div className="sumRight">
                      <span className={`badge ${r.correct ? "ok" : "bad"}`}>{status}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="summaryFooter">
              <button
                ref={retryBtnRef}
                className="primary"
                onPointerDown={playTap}
                onClick={retry}
              >
                Prøv igen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="cardTop">
              <div className="tries">
                <span className={`dot ${attemptsUsed >= 1 ? "used" : ""}`} />
                <span className={`dot ${attemptsUsed >= 2 ? "used" : ""}`} />
                <span className="triesText">{attemptsLeft} forsøg tilbage</span>
              </div>

              <button
                className="iconBtn"
                onPointerDown={playTap}
                onClick={() => setShowHelp((x) => !x)}
                aria-label="Hjælp"
              >
                <HelpIcon />
              </button>

              {showHelp && <div className="helpBubble" role="dialog">{helpText}</div>}
            </div>

            <div className="center">
              {item && (
                <>
                  <div className="promptRow">
                    <div className="prompt">{item?.meta?.instruction ?? "Udregn"}</div>
                    {numberLine &&
                    typeof numberLine.start === "number" &&
                    typeof numberLine.delta === "number" &&
                    typeof numberLine.steps === "number" &&
                    typeof numberLine.min === "number" &&
                    typeof numberLine.max === "number" ? (
                      <NumberLineMove
                        start={numberLine.start}
                        delta={numberLine.delta}
                        steps={numberLine.steps}
                        min={numberLine.min}
                        max={numberLine.max}
                      />
                    ) : item.display.kind === "fraction" ? (
                      <Fraction num={item.display.num} den={item.display.den} />
                    ) : item.response_kind === "order" ? (
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#334155", textAlign: "center" }}>{""}</div>
                    ) : (
                      <div style={{ fontSize: 38, fontWeight: 900, color: "#0f172a", textAlign: "center" }}>
                        {item.display.text}
                      </div>
                    )}
                  </div>

                  <form className="answerArea" onSubmit={(e) => (e.preventDefault(), submit())}>
                    {item.response_kind === "mcq" ? (
                      <MCQChoices
                        item={item as ItemMCQ}
                        choice={mcqChoice}
                        setChoice={(i) => {
                          setMcqChoice(i);
                          if (banner?.title === "Prøv igen") setBanner(null);
                        }}
                        disabled={holdForNext}
                        firstRef={mcqFirstRef}
                      />
                    ) : item.response_kind === "order" ? (
                      <OrderDragList
                        item={item as ItemOrder}
                        order={order.length ? order : (item as ItemOrder).values.map((_, i) => i)}
                        setOrder={(o) => {
                          setOrder(o);
                          if (banner?.title === "Prøv igen") setBanner(null);
                        }}
                        disabled={holdForNext}
                        firstRef={orderFirstRef}
                      />
                    ) : item.response_kind === "int" ? (
                      areaMode ? (
                        <AreaModelWork
                          area={(item as any).meta?.area}
                          inputs={areaInputs}
                          setInputs={setAreaInputs}
                          disabled={holdForNext}
                        />
                      ) : columnMode && operands ? (
                        <ColumnAdditionWork
                          a={operands.a}
                          b={operands.b}
                          ans={colAns}
                          setAns={setColAns}
                          carry={colCarry}
                          setCarry={setColCarry}
                          disabled={holdForNext}
                        />
                      ) : (
                        <input
                          ref={inputRef}
                          className="answerInput"
                          value={answer}
                          onChange={(e) => {
                            setAnswer(e.target.value);
                            if (banner?.title === "Prøv igen") setBanner(null);
                          }}
                          placeholder={compMode ? "Skriv tal eller fx 80+26" : "Skriv dit svar..."}
                          inputMode="numeric"
                          autoComplete="off"
                          disabled={holdForNext}
                        />
                      )
                    ) : item.response_kind === "number" ? (
                      <input
                        ref={inputRef}
                        className="answerInput"
                        value={answer}
                        onChange={(e) => {
                          setAnswer(e.target.value);
                          if (banner?.title === "Prøv igen") setBanner(null);
                        }}
                        placeholder="Skriv decimaltal..."
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={holdForNext}
                      />
                    ) : (
                      <div style={{ display: "flex", gap: 10, width: "100%" }}>
                        <input
                          ref={inputRef}
                          className="answerInput"
                          style={{ flex: 1 }}
                          value={answer}
                          onChange={(e) => {
                            setAnswer(e.target.value);
                            if (banner?.title === "Prøv igen") setBanner(null);
                          }}
                          placeholder="Kvotient"
                          inputMode="numeric"
                          autoComplete="off"
                          disabled={holdForNext}
                        />
                        <input
                          ref={remRef}
                          className="answerInput"
                          style={{ flex: 1 }}
                          value={remainder}
                          onChange={(e) => {
                            setRemainder(e.target.value);
                            if (banner?.title === "Prøv igen") setBanner(null);
                          }}
                          placeholder="Rest"
                          inputMode="numeric"
                          autoComplete="off"
                          disabled={holdForNext}
                        />
                      </div>
                    )}
                  </form>

                  <div className="feedbackSlot">
                    {banner ? (
                      <div
                        key={`${banner.kind}-${banner.kind === "ok" ? bannerPulse : banner.title}`}
                        className={`banner ${banner.kind} ${banner.kind === "ok" ? "pulse" : ""}`}
                      >
                        <div className="bannerTitle">{banner.title}</div>
                        {banner.body && <div className="bannerBody">{banner.body}</div>}
                      </div>
                    ) : (
                      <div className="banner placeholder" aria-hidden="true">
                        <div className="bannerTitle">&nbsp;</div>
                        <div className="bannerBody">&nbsp;</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="cardBottom" />
          </>
        )}
      </div>

      {!finished && (
        <div className="bottomDock">
          {!holdForNext ? (
            <>
              <button
                  className="ghostBtn"
                  type="button"
                  onPointerDown={playTap}
                  onClick={skip}
                >
                Spring over
              </button>
              <button
                  className="primary"
                  type="button"
                  disabled={!canSubmit}
                  onPointerDown={playTap}
                  onClick={submit}
                >
                Svar
              </button>
            </>
          ) : (
            <button
              ref={nextBtnRef}
              className="primary"
              type="button"
              onPointerDown={playTap}
              onClick={nextClick}
            >
              Næste
            </button>
          )}
        </div>
      )}
    </div>
  );
}
