import { Link, useLocation } from "react-router-dom";
import { useProgress } from "../progress/ProgressContext";
import { SKILLMAP, SKILL_GROUPS, collectNodesInOrder, type SkillGroup } from "../skillmap/skillmap";
import { statusOf } from "../progress/unlock";

type Domain = "fundament" | "add" | "sub" | "mul" | "div" | "all";

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
      return "Addition";
    case "sub":
      return "Subtraktion";
    case "mul":
      return "Multiplikation";
    case "div":
      return "Division";
    case "all":
      return "Alle skills";
  }
}

function isDomain(x: string | null): x is Domain {
  return x === "fundament" || x === "add" || x === "sub" || x === "mul" || x === "div" || x === "all";
}

function splitGroupKey(key: string): string[] {
  return key.split("::").map((s) => s.trim()).filter(Boolean);
}

function findGroupByPath(path: string[]): SkillGroup | null {
  if (path.length === 0) return null;
  let current: SkillGroup | undefined;
  let layer: SkillGroup[] = SKILL_GROUPS;

  for (const name of path) {
    current = layer.find((g) => g.name === name);
    if (!current) return null;
    layer = current.children ?? [];
  }

  return current ?? null;
}

/**
 * UI-title: behold fuld titel i skillmap (fx "Addition A0.1: Tæl alt (≤5)"),
 * men vis kun efter kolon, når præfikset matcher nodeId.
 */
function uiTitle(full: string, nodeId: string): string {
  const i = full.indexOf(":");
  if (i < 0) return full;

  const before = full.slice(0, i);
  // Stripper kun hvis præfikset (før :) faktisk indeholder nodeId (fx "A0.1")
  if (!before.includes(nodeId)) return full;

  const after = full.slice(i + 1).trim();
  return after || full;
}

export default function SkillsPage() {
  const { progress } = useProgress();
  const loc = useLocation();
  const sp = new URLSearchParams(loc.search);
  const domainParam = sp.get("domain");
  const groupParam = sp.get("group");
  const domain: Domain = isDomain(domainParam) ? domainParam : "all";

  const groupPath = groupParam ? splitGroupKey(decodeURIComponent(groupParam)) : null;
  const group = groupPath ? findGroupByPath(groupPath) : null;
  const groupNodeIds = group ? new Set(collectNodesInOrder(group)) : null;

  const nodes = SKILLMAP.nodes.filter((n) => {
    if (groupNodeIds) return groupNodeIds.has(n.id);
    if (domain === "all") return true;
    const d = domainFromNodeId(n.id);
    return d === domain;
  });

  return (
    <div className="shell">
      <div className="shellHead">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <h1>{group ? groupPath?.at(-1) ?? labelForDomain(domain) : labelForDomain(domain)}</h1>
            <div className="muted">Vælg en skill og start træning</div>
          </div>
          <Link className="btn" to="/">
            Home
          </Link>
        </div>
      </div>

      <div className="grid">
        {nodes.map((n) => {
          const st = statusOf(SKILLMAP, progress, n.id);
          const p = progress.nodes[n.id];
          const masteryPct = p ? Math.round(p.mastery * 100) : 0;
          const perfect = !!p && p.mastery >= 0.99;

          return (
            <div key={n.id} className={`card2 ${st}`}>
              <div className="row">
                <div>
                  <div className="title2">{uiTitle(n.title, n.id)}</div>
                  <div className="muted small">{n.description ?? ""}</div>
                </div>
                <div className={`badge2 ${st}`}>
                  {st === "locked" ? "Låst" : st === "available" ? "Klar" : perfect ? "Mestrer ★" : "Mestrer"}
                </div>
              </div>

              <div className="meter">
                <div className="meterFill" style={{ width: `${masteryPct}%` }} />
              </div>

              <div className="actions">
                <Link
                  className="btn"
                  to={`/node/${encodeURIComponent(n.id)}${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`}
                >
                  Åbn
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
