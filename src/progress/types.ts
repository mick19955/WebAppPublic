export type Outcome = "correct" | "incorrect" | "skipped";

export type PracticeEvent = {
  event_id: string;
  timestamp: string;

  node_id: string;
  blueprint_id: string;
  item_id: string;

  outcome: Outcome;
  error_code?: string;

  // IRT metadata
  node_level?: number;
  node_b?: number;

  item_level?: number;
  item_b?: number;
};

export type NodeProgress = {
  // mastery in [0..1]
  mastery: number;
  theta: number;

  // Reference difficulty for the node (bRef).
  // mastery = sigmoid(theta - node_b)
  node_b: number;

  attempts: number;
  correct: number;
  last_ts?: string;
};

export type ProgressState = {
  nodes: Record<string, NodeProgress>;
  events: PracticeEvent[];
};
