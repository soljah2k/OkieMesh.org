import fs from "fs";
import path from "path";
import type { AgentConfig } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "config", "agents.json");

export function loadAgents(): AgentConfig[] {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw) as { agents: AgentConfig[] };
  return parsed.agents;
}

export function getAgent(id: string): AgentConfig | undefined {
  return loadAgents().find((a) => a.id === id);
}
