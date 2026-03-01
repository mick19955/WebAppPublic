import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import "./GroupPage.css";

import { useProgress } from "../progress/ProgressContext";
import { statusOf } from "../progress/unlock";
import { isMastered } from "../progress/mastery";
import { SKILLMAP } from "../skillmap/skillmap";
import {
  SKILL_GROUPS,
  findGroupByPath,
  collectNodesInOrder,
  type SkillGroup,
} from "../skillmap/skillmap";

type NodeRender = {
  nodeId: string;
  title: string;
  status: "mastered" | "available" | "locked";
  gated: boolean;
  isCurrent: boolean;
  mastery: number;
};

function parsePathParam(raw: string | null): string[] {
  if (!raw) return [];
  const decoded = decodeURIComponent(raw);
  return decoded
    .split("::")
    .map((s) => s.trim())
    .filter(Boolean);
}

function nodeTitle(nodeId: string): string {
  const n = SKILLMAP.nodes.find((x) => x.id === nodeId);
  return n?.title ?? nodeId;
}

export default function GroupPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { progress } = useProgress();

  const path = useMemo(() => parsePathParam(sp.get("path")), [sp]);

  const group = useMemo<SkillGroup | null>(
    () => findGroupByPath(SKILL_GROUPS, path),
    [path]
  );

  const levels = group?.children ?? [];
  const orderedNodeIds = useMemo(
    () => (group ? collectNodesInOrder(group) : []),
    [group]
  );

  // Option B gating: the first non-mastered node in the ordered list is "current".
  const currentIndex = useMemo(() => {
    for (let i = 0; i < orderedNodeIds.length; i++) {
      const p = progress.nodes[orderedNodeIds[i]];
      if (!p || !isMastered(p)) return i;
    }
    return Math.max(0, orderedNodeIds.length - 1);
  }, [orderedNodeIds, progress.nodes]);

  const renderLevels = useMemo(() => {
    const nodeRendersById: Record<string, NodeRender> = {};

    orderedNodeIds.forEach((nodeId, idx) => {
      const p = progress.nodes[nodeId];
      const mastered = p ? isMastered(p) : false;
      const status = statusOf(SKILLMAP, progress, nodeId);
      const gated = idx > currentIndex && !mastered;
      const isCurrent = idx === currentIndex && !mastered;

      nodeRendersById[nodeId] = {
        nodeId,
        title: nodeTitle(nodeId),
        status,
        gated,
        isCurrent,
        mastery: p?.mastery ?? 0,
      };
    });

    return {
      levels: levels.map((lvl) => {
        const nodes = (lvl.nodes ?? [])
          .map((nodeId) => nodeRendersById[nodeId])
          .filter(Boolean);
        return { level: lvl, nodes };
      }),
      currentNodeId: orderedNodeIds[currentIndex],
    };
  }, [levels, orderedNodeIds, currentIndex, progress]);

  const breadcrumb = path.join(" → ");

  if (!group) {
    return (
      <div className="groupPage">
        <div className="groupShell">
          <div className="groupLeft">
            <div className="groupHero">
              <div className="groupHeroTitle">Gruppe ikke fundet</div>
              <div className="groupHeroSub">
                Tjek at URL-parameteren <code>path</code> matcher en gruppe i
                SKILL_GROUPS.
              </div>
            </div>

            <div className="groupBackWrap">
              <button
                type="button"
                className="groupBackBtn"
                onClick={() => nav("/")}
              >
                ← Tilbage til forsiden
              </button>
            </div>
          </div>
          <div className="groupRight">
            <div className="groupEmpty">
              <div className="groupEmptyTitle">Ingen data</div>
              <div className="groupEmptySub">path: {breadcrumb || "(tom)"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onNodeClick = (n: NodeRender) => {
    // Option B:
    // - mastered nodes are clickable (review)
    // - current node is clickable if it is available
    // - locked/gated nodes are not clickable
    if (n.gated) return;
    const mastered = !!progress.nodes[n.nodeId] && isMastered(progress.nodes[n.nodeId]);
    if (!mastered && n.status === "locked") return;
    // Pass a return URL so PracticePage can send the user back here via the "X" button.
    const pathParam = encodeURIComponent(path.join("::"));
    nav(`/practice/${encodeURIComponent(n.nodeId)}`, {
      state: { returnTo: `/group?path=${pathParam}` },
    });
  };

  const lessonCount = orderedNodeIds.length;
  const masteredCount = orderedNodeIds.filter((id) => {
    const p = progress.nodes[id];
    return p ? isMastered(p) : false;
  }).length;
  const pct = lessonCount > 0 ? Math.round((masteredCount / lessonCount) * 100) : 0;

  return (
    <div className="groupPage">
      <div className="groupShell">
        <div className="groupLeft">
          <div className="groupHero">
            <div className="groupHeroEyebrow">LÆRINGSSTI</div>
            <div className="groupHeroTitle">{group.name}</div>
            <div className="groupHeroSub">{breadcrumb}</div>

            <div className="groupHeroStats">
              <div className="stat">
                <div className="statVal">{lessonCount}</div>
                <div className="statLbl">Noder</div>
              </div>
              <div className="stat">
                <div className="statVal">{masteredCount}</div>
                <div className="statLbl">Mestret</div>
              </div>
              <div className="stat">
                <div className="statVal">{pct}%</div>
                <div className="statLbl">Fremdrift</div>
              </div>
            </div>

            <div className="groupHeroProgress">
              <div className="bar">
                <div className="barFill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="groupHeroHint">
              Kun den næste node i rækkefølgen er aktiv. Tidligere mestrede noder kan åbnes som repetition.
            </div>
          </div>

          <div className="groupBackWrap">
            <button
              type="button"
              className="groupBackBtn"
              onClick={() => nav("/")}
            >
              ← Tilbage til forsiden
            </button>
          </div>
        </div>

        <div className="groupRight">
          <div className="levels">
            {renderLevels.levels.map(({ level, nodes }) => (
              <div className="levelBlock" key={level.name}>
                <div className="levelHeader">
                  <div className="levelPill">{level.name.toUpperCase()}</div>
                </div>

                <div className="levelNodes">
                  {nodes.map((n) => {
                    const mastered = !!progress.nodes[n.nodeId] && isMastered(progress.nodes[n.nodeId]);
                    const disabled = n.gated || (!mastered && n.status === "locked");
                    const cls = [
                      "nodeToken",
                      n.isCurrent ? "current" : "",
                      n.status === "mastered" ? "mastered" : "",
                      disabled ? "disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={n.nodeId}
                        className={cls}
                        onClick={() => onNodeClick(n)}
                        disabled={disabled}
                        type="button"
                      >
                        {n.isCurrent && !disabled ? (
                          <div className="nodeTokenBadge" aria-label="Næste node">
                            NÆSTE
                          </div>
                        ) : null}

                        <div className="nodeTokenIcon">
                          {n.status === "mastered" ? "✓" : n.isCurrent ? "▶" : disabled ? "🔒" : "•"}
                        </div>

                        <div className="nodeTokenText">
                          <div className="nodeTokenTitle">{n.title}</div>
                          <div className="nodeTokenSub">
                            {n.status === "mastered"
                              ? "Mestret"
                              : disabled
                              ? "Låst"
                              : n.isCurrent
                              ? "Næste"
                              : "Tilgængelig"}
                          </div>

                          <div className="nodeTokenBar">
                            <div
                              className="nodeTokenBarFill"
                              style={{ width: `${Math.round(n.mastery * 100)}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
