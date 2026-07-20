import { exec } from "child_process";
import { loadAgents } from "@/lib/agents";
import type { AgentConfig, AgentStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function probeCommand(cmd: string): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, detail: (stderr || err.message).trim().split("\n")[0].slice(0, 120) });
      } else {
        resolve({ ok: true, detail: stdout.trim().split("\n")[0].slice(0, 120) });
      }
    });
  });
}

async function probeUrl(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message.slice(0, 120) : "unreachable" };
  }
}

async function probe(agent: AgentConfig): Promise<AgentStatus> {
  const started = Date.now();
  let result: { ok: boolean; detail: string };
  if (agent.healthCommand) {
    result = await probeCommand(agent.healthCommand);
  } else if (agent.healthUrl) {
    result = await probeUrl(agent.healthUrl);
  } else if (agent.kind === "http" && agent.url) {
    result = await probeUrl(agent.url);
  } else {
    result = { ok: false, detail: "no health check configured" };
  }
  return {
    id: agent.id,
    online: result.ok,
    detail: result.detail,
    latencyMs: Date.now() - started,
  };
}

export async function GET() {
  const agents = loadAgents();
  const statuses = await Promise.all(agents.map(probe));
  return Response.json({ statuses });
}
