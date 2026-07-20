import { spawn } from "child_process";
import { createInterface } from "readline";
import { getAgent } from "@/lib/agents";
import { bridgeStream } from "@/lib/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

/**
 * Generic agent bridge for non-Claude agents.
 *
 * - kind "cli":  runs the command from config/agents.json with the prompt
 *   substituted for {prompt} (or appended). The command template comes ONLY
 *   from the config file on disk — the browser supplies just the prompt text,
 *   which is passed as a single argv entry, never through a shell.
 * - kind "http": POSTs { prompt } as JSON to the configured URL and streams
 *   the response body back as text.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const agent = getAgent(id);
  if (!agent) return Response.json({ error: `unknown agent: ${id}` }, { status: 404 });
  if (agent.kind === "claude-cli") {
    return Response.json({ error: "use /api/claude/stream for the Claude bridge" }, { status: 400 });
  }

  const body = (await req.json()) as { prompt?: string };
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });

  if (agent.kind === "http") {
    const url = agent.url;
    if (!url) return Response.json({ error: "agent has no url configured" }, { status: 500 });
    return bridgeStream(async (emit, signal) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal,
      });
      if (!res.ok || !res.body) {
        emit({ type: "error", message: `HTTP ${res.status} from ${url}` });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        emit({ type: "text", text: decoder.decode(value, { stream: true }) });
      }
    });
  }

  // kind === "cli"
  const template = agent.command;
  if (!template) return Response.json({ error: "agent has no command configured" }, { status: 500 });

  const parts = template.split(/\s+/);
  const cmd = parts[0];
  let injected = false;
  const args = parts.slice(1).map((p) => {
    if (p === "{prompt}") {
      injected = true;
      return prompt;
    }
    return p;
  });
  if (!injected) args.push(prompt);

  return bridgeStream(async (emit, signal) => {
    const child = spawn(cmd, args, { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    signal.addEventListener("abort", () => child.kill("SIGTERM"));

    const rlOut = createInterface({ input: child.stdout });
    rlOut.on("line", (line) => emit({ type: "text", text: line + "\n" }));
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));

    const code: number = await new Promise((resolve) => {
      child.on("close", (c) => resolve(c ?? 0));
      child.on("error", (err) => {
        emit({ type: "error", message: err.message });
        resolve(-1);
      });
    });
    if (code !== 0 && !signal.aborted && stderr.trim()) {
      emit({ type: "error", message: stderr.trim().slice(0, 500) });
    }
  });
}
