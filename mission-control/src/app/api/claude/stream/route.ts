import { spawn } from "child_process";
import { createInterface } from "readline";
import { bridgeStream } from "@/lib/stream";
import type { BridgeEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

interface StreamRequest {
  prompt: string;
  sessionId?: string;
  cwd?: string;
  permissionMode?: "default" | "acceptEdits" | "plan" | "bypassPermissions";
}

/**
 * Claude Code CLI bridge.
 *
 * Spawns `claude -p --output-format stream-json` and forwards its NDJSON
 * events to the browser, simplified into BridgeEvents. Session continuity is
 * handled with `--resume <sessionId>`.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as StreamRequest;
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
  ];
  if (body.sessionId) args.push("--resume", body.sessionId);
  if (body.permissionMode && body.permissionMode !== "default") {
    args.push("--permission-mode", body.permissionMode);
  }

  return bridgeStream(async (emit, signal) => {
    const child = spawn("claude", args, {
      cwd: body.cwd || process.env.HOME || process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    signal.addEventListener("abort", () => child.kill("SIGTERM"));

    child.stdin.write(prompt);
    child.stdin.end();

    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));

    // Track whether partial deltas arrived so we don't double-emit full
    // assistant messages that were already streamed piece by piece.
    let sawDeltaForCurrentTurn = false;

    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(trimmed);
      } catch {
        emit({ type: "raw", text: trimmed });
        return;
      }
      for (const out of translate(evt, {
        sawDelta: () => sawDeltaForCurrentTurn,
        setSawDelta: (v: boolean) => (sawDeltaForCurrentTurn = v),
      })) {
        emit(out);
      }
    });

    const code: number = await new Promise((resolve) => {
      child.on("close", (c) => resolve(c ?? 0));
      child.on("error", () => resolve(-1));
    });

    if (code !== 0 && !signal.aborted) {
      emit({
        type: "error",
        message: stderr.trim() || `claude exited with code ${code}`,
      });
    }
  });
}

interface TurnState {
  sawDelta: () => boolean;
  setSawDelta: (v: boolean) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function* translate(evt: any, turn: TurnState): Generator<BridgeEvent> {
  switch (evt.type) {
    case "system": {
      if (evt.subtype === "init") {
        yield { type: "init", sessionId: evt.session_id, model: evt.model };
      }
      return;
    }
    case "stream_event": {
      const inner = evt.event;
      if (inner?.type === "content_block_delta") {
        if (inner.delta?.type === "text_delta" && inner.delta.text) {
          turn.setSawDelta(true);
          yield { type: "text", text: inner.delta.text };
        } else if (inner.delta?.type === "thinking_delta") {
          yield { type: "thinking" };
        }
      } else if (
        inner?.type === "content_block_start" &&
        inner.content_block?.type === "tool_use"
      ) {
        yield { type: "tool", name: inner.content_block.name ?? "tool" };
      }
      return;
    }
    case "assistant": {
      // Full assistant message. Only emit text if no partial deltas streamed
      // (older CLIs without --include-partial-messages support).
      const blocks = evt.message?.content ?? [];
      for (const block of blocks) {
        if (block.type === "text" && block.text && !turn.sawDelta()) {
          yield { type: "text", text: block.text };
        } else if (block.type === "tool_use" && !turn.sawDelta()) {
          yield {
            type: "tool",
            name: block.name ?? "tool",
            detail: summarizeToolInput(block.name, block.input),
          };
        }
      }
      turn.setSawDelta(false);
      return;
    }
    case "result": {
      yield {
        type: "result",
        costUsd: evt.total_cost_usd ?? evt.cost_usd,
        durationMs: evt.duration_ms,
        inputTokens: evt.usage?.input_tokens,
        outputTokens: evt.usage?.output_tokens,
        isError: Boolean(evt.is_error),
      };
      return;
    }
    default:
      return;
  }
}

function summarizeToolInput(name: string | undefined, input: any): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const candidate =
    input.command ?? input.file_path ?? input.pattern ?? input.url ?? input.query;
  if (typeof candidate === "string") {
    return candidate.length > 80 ? candidate.slice(0, 77) + "…" : candidate;
  }
  return undefined;
}
