import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { SKILLMAP } from "../skillmap/skillmap";
import { useProgress } from "../progress/ProgressContext";
import { statusOf } from "../progress/unlock";

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

export default function NodePage() {
  const params = useParams();
  const raw = (params as any).id ?? (params as any).nodeId ?? (params as any).node_id ?? "";
  const nodeId = raw ? safeDecode(String(raw)) : "";

  const node = useMemo(() => SKILLMAP.nodes.find((n) => n.id === nodeId), [nodeId]);

  const { progress } = useProgress();
  const nav = useNavigate();

  const loc = useLocation();
  const sp = new URLSearchParams(loc.search);
  const domainParam = sp.get("domain");
  const backTo = domainParam ? `/skills?domain=${encodeURIComponent(domainParam)}` : "/skills";

  if (!node) {
    return (
      <div className="shell">
        <h1>Ukendt node</h1>
        <div className="muted small">nodeId: {nodeId || "—"}</div>
        <Link className="btn" to={backTo}>
          Tilbage
        </Link>
      </div>
    );
  }

  const st = statusOf(SKILLMAP, progress, node.id);
  const p = progress.nodes[node.id];
  const masteryPct = p ? Math.round(p.mastery * 100) : 0;
  const perfect = !!p && p.mastery >= 0.99;

  const displayTitle = uiTitle(node.title, node.id);

  return (
    <div className="shell">
      <div className="shellHead">
        <h1>{displayTitle}</h1>
        <div className="muted">{node.description}</div>
      </div>

      <div className="card2">
        <div className="row">
          <div className="muted">Status</div>
          <div className={`badge2 ${st}`}>
            {st === "locked" ? "Låst" : st === "available" ? "Klar" : perfect ? "Mestrer ★" : "Mestrer"}
          </div>
        </div>

        <div className="row">
          <div className="muted">Mastery</div>
          <div>
            <b>{masteryPct}%</b>
          </div>
        </div>

        <div className="row">
          <div className="muted">Prereqs</div>
          <div>{node.prereqs.length ? node.prereqs.join(", ") : "—"}</div>
        </div>

        <div className="actions">
          <button
            className="btn primary"
            disabled={st === "locked"}
            onClick={() =>
              nav(`/practice/${encodeURIComponent(node.id)}${domainParam ? `?domain=${encodeURIComponent(domainParam)}` : ""}`)
            }
          >
            Start 10 opgaver
          </button>

          <Link className="btn" to={backTo}>
            Tilbage
          </Link>
        </div>
      </div>
    </div>
  );
}
