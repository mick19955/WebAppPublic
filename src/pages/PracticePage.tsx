import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { SKILLMAP } from "../skillmap/skillmap";
import { useProgress } from "../progress/ProgressContext";
import PracticeSession from "../components/PracticeSession";
import "./PracticePage.css";

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * UI-title: behold fuld titel i skillmap (fx "Addition A0.1: Tæl alt (≤5)"),
 * men vis kun efter kolon, når præfikset matcher nodeId.
 */
function uiTitle(full: string, nodeId: string): string {
  const i = full.indexOf(":");
  if (i < 0) return full;

  const before = full.slice(0, i);
  if (!before.includes(nodeId)) return full;

  const after = full.slice(i + 1).trim();
  return after || full;
}

export default function PracticePage() {
  const [inAnim, setInAnim] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setInAnim(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const params = useParams();
  const raw = (params as any).id ?? (params as any).nodeId ?? (params as any).node_id ?? "";
  const nodeId = raw ? safeDecode(String(raw)) : "";

  const node = useMemo(() => SKILLMAP.nodes.find((n) => n.id === nodeId), [nodeId]);
  const nav = useNavigate();
  const { addEvent } = useProgress();

  const loc = useLocation();
  // If we came here from a GroupPage, it passes a return URL in location.state.
  // This lets the PracticeSession "X" return the user to the exact group they came from.
  const returnTo = (loc.state as any)?.returnTo as string | undefined;
  const sp = new URLSearchParams(loc.search);
  const domainParam = sp.get("domain");
  const domainQs = domainParam ? `?domain=${encodeURIComponent(domainParam)}` : "";

  const seedRef = useRef<number>(Math.floor(Math.random() * 1e9));

  if (!node) return <div className="shell">Ukendt node</div>;

  const blueprintId = node.blueprints[0];
  const level = node.default_level;
  const adaptive = node.adaptive ?? true;

  return (
    <div className={`practiceEnter ${inAnim ? "isIn" : ""}`}>
      <PracticeSession
        nodeId={node.id}
        title={uiTitle(node.title, node.id)}
        blueprintId={blueprintId}
        level={level}
        adaptive={adaptive}
        seed={seedRef.current}
        totalItems={10}
        onEvent={addEvent}
        onExit={() => nav(returnTo ?? `/node/${encodeURIComponent(node.id)}${domainQs}`)}
        onExitSummary={() => nav(returnTo ?? `/node/${encodeURIComponent(node.id)}${domainQs}`)}
      />
    </div>
  );
}
