import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useProgress } from "../progress/ProgressContext";
import { SKILLMAP, SKILL_GROUPS, collectNodesInOrder, type SkillGroup } from "../skillmap/skillmap";
import { statusOf } from "../progress/unlock";
import "./HomePage.css";
import { useAudio } from "../audio/AudioContext";

type Domain = "fundament" | "add" | "sub" | "mul" | "div";

function SomeButton() {
  const { prime, audio } = useAudio();

  return (
    <button
      onPointerDown={async () => {
        await prime();      // unlock audio on iOS/Chrome policies
        audio.play("tap");
      }}
    >
      Start
    </button>
  );
}

function domainFromNodeId(id: string): Domain | "other" {
  if (id.startsWith("T") || id.startsWith("E")) return "fundament";
  if (id.startsWith("A")) return "add";
  if (id.startsWith("S")) return "sub";
  if (id.startsWith("M")) return "mul";
  if (id.startsWith("D")) return "div";
  return "other";
}

function labelForDomain(d: Domain): string {
  switch (d) {
    case "fundament":
      return "Fundament";
    case "add":
      return "Plus";
    case "sub":
      return "Minus";
    case "mul":
      return "Gange";
    case "div":
      return "Division";
  }
}

function uiTitle(full: string, nodeId: string): string {
  const i = full.indexOf(":");
  if (i < 0) return full;
  const before = full.slice(0, i);
  if (!before.includes(nodeId)) return full;
  const after = full.slice(i + 1).trim();
  return after || full;
}

type RailState = { canLeft: boolean; canRight: boolean };

function useRailState(ref: { current: HTMLDivElement | null }): RailState {
  const [st, setSt] = useState<RailState>({ canLeft: false, canRight: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;
      setSt({ canLeft: left > 1, canRight: left < max - 1 });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);

  return st;
}

function scrollByPage(el: HTMLDivElement, dir: -1 | 1) {
  const dx = Math.round(el.clientWidth * 0.78) * dir;
  el.scrollBy({ left: dx, behavior: "smooth" });
}

function useDragScroll(ref: { current: HTMLDivElement | null }) {
  const drag = useRef<{
    active: boolean;
    dragging: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    pointerId: number | null;
    moved: boolean;
    suppressClick: boolean;
  }>({
    active: false,
    dragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    pointerId: null,
    moved: false,
    suppressClick: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Drag skal føles "direkte" (1:1 med pointeren). Vi bruger en meget lille
    // threshold, så det føles responsivt, men stadig ikke saboterer klik.
    const DRAG_THRESHOLD_PX = 1;

    // Overscroll (bounce) – når brugeren trækker forbi venstre/højre kant.
    // Vi bruger en simpel "resistance"-model: jo længere udenfor, jo mindre
    // visuel bevægelse.
    const RESISTANCE = 0.35;
    const snapBack = () => {
      el.classList.add("lpBounce");
      el.style.transform = "translateX(0px)";
      // Fjern transition-class efter animation.
      window.setTimeout(() => el.classList.remove("lpBounce"), 260);
    };

    const onPointerDown = (e: PointerEvent) => {
      // Kun venstre click / touch / pen
      if (e.pointerType === "mouse" && e.button !== 0) return;
      drag.current.active = true;
      drag.current.dragging = false;
      drag.current.moved = false;
      drag.current.startX = e.clientX;
      drag.current.startY = e.clientY;
      drag.current.startLeft = el.scrollLeft;
      drag.current.pointerId = e.pointerId;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;

      // Før vi anser det som et drag: kræv en lille horisontal bevægelse,
      // og at den horisontale bevægelse dominerer (så vertikal scroll ikke trigges).
      if (!drag.current.dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
        if (Math.abs(dx) < Math.abs(dy)) return;

        drag.current.dragging = true;
        drag.current.moved = true;

        // Reset referencepunkt så rail'en følger pointeren "med det samme" uden at
        // føles som et stort spring efter threshold.
        drag.current.startX = e.clientX;
        drag.current.startY = e.clientY;
        drag.current.startLeft = el.scrollLeft;

        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        el.classList.add("isDragging");
      }

      // Når vi er i drag-mode, scroller vi rail'en.
      e.preventDefault();

      const desired = drag.current.startLeft - dx;
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const clamped = Math.max(0, Math.min(max, desired));
      el.scrollLeft = clamped;

      // Overscroll: hvis vi forsøger at gå udenfor [0,max], så lav en visuel
      // translation med modstand.
      const over = desired - clamped;
      if (Math.abs(over) > 0.5) {
        // Ingen smooth under drag.
        // Bemærk: vi inverterer fortegnet, så "rubber band" bevæger sig i samme
        // retning som brugerens træk ved kanten.
        el.classList.remove("lpBounce");
        el.style.transform = `translateX(${-over * RESISTANCE}px)`;
      } else {
        el.style.transform = "translateX(0px)";
      }
    };

    const end = (e: PointerEvent) => {
      if (!drag.current.active) return;
      drag.current.active = false;

      // Hvis brugeren trak (ikke bare klikkede), så undertryk det efterfølgende click.
      if (drag.current.dragging || drag.current.moved) {
        drag.current.suppressClick = true;
        setTimeout(() => {
          drag.current.suppressClick = false;
        }, 0);
      }

      if (drag.current.dragging) {
        el.classList.remove("isDragging");
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }

      // Snap back hvis vi har overscroll-translation.
      snapBack();

      drag.current.dragging = false;
      drag.current.pointerId = null;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!drag.current.suppressClick) return;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("pointerleave", end);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.removeEventListener("pointerleave", end);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [ref]);
}

function findTopGroup(domain: Domain): SkillGroup | null {
  const want =
    domain === "fundament"
      ? "Fundament"
      : domain === "add"
      ? "Addition"
      : domain === "sub"
      ? "Subtraktion"
      : domain === "mul"
      ? "Multiplikation"
      : "Division";
  return SKILL_GROUPS.find((g) => g.name === want) ?? null;
}

function groupPathKey(path: string[]) {
  return path.join("::");
}

function summarizeGroup(progress: any, g: SkillGroup) {
  const nodeIds = collectNodesInOrder(g);
  if (nodeIds.length === 0) return { mastery: 0, locked: 0, total: 0, attempts: 0 };

  let sum = 0;
  let locked = 0;
  let attempts = 0;

  for (const id of nodeIds) {
    const st = statusOf(SKILLMAP, progress, id);
    if (st === "locked") locked += 1;
    const p = progress.nodes[id];
    sum += p ? p.mastery : 0;
    attempts += p ? p.attempts : 0;
  }

  return { mastery: sum / nodeIds.length, locked, total: nodeIds.length, attempts };
}

function LearningRail(props: { domain: Domain }) {
  const { progress } = useProgress();
  const railRef = useRef<HTMLDivElement | null>(null);
  const { canLeft, canRight } = useRailState(railRef);
  useDragScroll(railRef);

  const top = useMemo(() => findTopGroup(props.domain), [props.domain]);
  const childrenGroups = top?.children ?? [];

  if (!top) {
    return null;
  }

  return (
    <section className="lpSection">
      <div className="lpSectionHead">
        <div>
          <div className="lpSectionTitle">{labelForDomain(props.domain)}</div>
          <div className="lpSectionSub">Trin for trin øvelser og mastery</div>
        </div>
        <Link className="lpAll" to={`/skills?domain=${encodeURIComponent(props.domain)}`}>Se alle</Link>
      </div>

      <div className="lpRailWrap">
        {/* Conditional fades */}
        {canLeft ? <div className="lpFade lpFadeLeft" /> : null}
        {canRight ? <div className="lpFade lpFadeRight" /> : null}

        {/* Arrows (fade in/out) */}
        <button
          className={`lpArrow lpArrowLeft ${canLeft ? "show" : "hide"}`}
          type="button"
          aria-label="Scroll venstre"
          onClick={() => {
            const el = railRef.current;
            if (el) scrollByPage(el, -1);
          }}
        >
          ‹
        </button>
        <button
          className={`lpArrow lpArrowRight ${canRight ? "show" : "hide"}`}
          type="button"
          aria-label="Scroll højre"
          onClick={() => {
            const el = railRef.current;
            if (el) scrollByPage(el, 1);
          }}
        >
          ›
        </button>

        <div className="lpRail" ref={railRef}>
          {childrenGroups.map((g) => {
            const path = [top!.name, g.name];
            const key = groupPathKey(path);
            const sum = summarizeGroup(progress, g);
            const masteryPct = Math.max(0, Math.min(100, Math.round(sum.mastery * 100)));

            const allLocked = sum.total > 0 && sum.locked === sum.total;
            const mastered = !allLocked && sum.total > 0 && sum.mastery >= 0.99;
            const inProgress = !allLocked && !mastered && sum.attempts > 0;

            let tag = "NY";
            if (allLocked) tag = "LÅST";
            else if (mastered) tag = "MESTRET";
            else if (inProgress) tag = "I GANG";

            return (
              <Link
                key={key}
                className={`lpCard ${allLocked ? "locked" : ""}`}
                to={`/group?path=${encodeURIComponent(key)}`}
                draggable={false}
              >
                <div className="lpCardArt" aria-hidden="true">
                  <div className="lpCardGlyph">{labelForDomain(props.domain).slice(0, 1)}</div>
                </div>
                <div className={`lpTag ${tag.toLowerCase().replace(" ", "-")}`}>{tag}</div>
                <div className="lpCardTitle">{g.name}</div>
                <div className="lpCardSub">
                  {sum.total} noder{sum.locked ? ` • ${sum.locked} låste` : ""}
                </div>
                <div className="lpProg">
                  <div className="lpProgFill" style={{ width: `${masteryPct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const domains: Domain[] = ["fundament", "add", "sub", "mul", "div"];

  return (
    <div className="lp">
      <div className="lpHeader">
        <div className="lpTitle">Læringsstier</div>
        <div className="lpSubtitle">Trin for trin veje til mestring</div>
      </div>

      {domains.map((d) => (
        <LearningRail key={d} domain={d} />
      ))}
    </div>
  );
}
