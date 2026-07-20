export type AgentKind = "claude-cli" | "cli" | "http";
export type AgentAccent = "cyan" | "amber" | "rose" | "mint";

export interface AgentConfig {
  id: string;
  name: string;
  callsign: string;
  tagline: string;
  kind: AgentKind;
  accent: AgentAccent;
  command?: string;
  url?: string;
  healthCommand?: string;
  healthUrl?: string;
}

export interface AgentStatus {
  id: string;
  online: boolean;
  detail: string;
  latencyMs: number | null;
}

export interface SystemStats {
  cpuPercent: number;
  memUsedGb: number;
  memTotalGb: number;
  memPercent: number;
  load1: number;
  uptimeSec: number;
  hostname: string;
  platform: string;
}

/** Simplified events forwarded to the browser over the stream. */
export type BridgeEvent =
  | { type: "init"; sessionId: string; model?: string }
  | { type: "text"; text: string }
  | { type: "tool"; name: string; detail?: string }
  | { type: "thinking" }
  | {
      type: "result";
      costUsd?: number;
      durationMs?: number;
      inputTokens?: number;
      outputTokens?: number;
      isError?: boolean;
    }
  | { type: "raw"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };
