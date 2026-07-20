"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { AgentConfig, BridgeEvent } from "@/lib/types";
import { ACCENTS, appendLog, bumpTally } from "@/lib/client";

interface ToolCall {
  name: string;
  detail?: string;
}

interface Turn {
  id: number;
  role: "user" | "agent";
  text: string;
  tools: ToolCall[];
  error?: string;
  streaming?: boolean;
}

export interface SessionMeta {
  sessionId: string | null;
  model: string | null;
  costUsd: number;
  outputTokens: number;
  lastDurationMs: number | null;
  missions: number;
}

export function Console({
  agent,
  onMeta,
}: {
  agent: AgentConfig;
  onMeta?: (meta: SessionMeta) => void;
}) {
  const accent = ACCENTS[agent.accent] ?? ACCENTS.cyan;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<SessionMeta>({
    sessionId: null,
    model: null,
    costUsd: 0,
    outputTokens: 0,
    lastDurationMs: null,
    missions: 0,
  });
  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;

  useEffect(() => {
    onMeta?.(meta);
  }, [meta, onMeta]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const patchLastAgentTurn = useCallback((fn: (t: Turn) => Turn) => {
    setTurns((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === "agent") {
          copy[i] = fn(copy[i]);
          break;
        }
      }
      return copy;
    });
  }, []);

  const send = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    appendLog({ agentId: agent.id, kind: "dispatch", text: prompt.slice(0, 120) });

    setTurns((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text: prompt, tools: [] },
      { id: nextId.current++, role: "agent", text: "", tools: [], streaming: true },
    ]);

    const abort = new AbortController();
    abortRef.current = abort;

    const endpoint =
      agent.kind === "claude-cli" ? "/api/claude/stream" : `/api/bridge/${agent.id}`;
    const payload =
      agent.kind === "claude-cli"
        ? { prompt, sessionId: metaRef.current.sessionId ?? undefined }
        : { prompt };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(`bridge returned ${res.status} ${detail.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: BridgeEvent;
          try {
            evt = JSON.parse(line) as BridgeEvent;
          } catch {
            continue;
          }
          handleEvent(evt);
        }
      }
    } catch (err) {
      if (!abort.signal.aborted) {
        const message = err instanceof Error ? err.message : String(err);
        patchLastAgentTurn((t) => ({ ...t, error: message, streaming: false }));
        appendLog({ agentId: agent.id, kind: "error", text: message.slice(0, 120) });
      }
    } finally {
      patchLastAgentTurn((t) => ({ ...t, streaming: false }));
      setBusy(false);
      abortRef.current = null;
    }

    function handleEvent(evt: BridgeEvent) {
      switch (evt.type) {
        case "init":
          setMeta((m) => ({ ...m, sessionId: evt.sessionId, model: evt.model ?? m.model }));
          break;
        case "text":
        case "raw":
          patchLastAgentTurn((t) => ({ ...t, text: t.text + evt.text }));
          break;
        case "tool":
          patchLastAgentTurn((t) => ({
            ...t,
            tools: [...t.tools, { name: evt.name, detail: evt.detail }],
          }));
          appendLog({ agentId: agent.id, kind: "tool", text: evt.name });
          break;
        case "result": {
          const cost = evt.costUsd ?? 0;
          const out = evt.outputTokens ?? 0;
          setMeta((m) => ({
            ...m,
            costUsd: m.costUsd + cost,
            outputTokens: m.outputTokens + out,
            lastDurationMs: evt.durationMs ?? m.lastDurationMs,
            missions: m.missions + 1,
          }));
          bumpTally({ missions: 1, costUsd: cost, outputTokens: out });
          appendLog({
            agentId: agent.id,
            kind: "reply",
            text: `mission complete · ${((evt.durationMs ?? 0) / 1000).toFixed(1)}s${cost ? ` · $${cost.toFixed(4)}` : ""}`,
          });
          break;
        }
        case "error":
          patchLastAgentTurn((t) => ({ ...t, error: evt.message }));
          appendLog({ agentId: agent.id, kind: "error", text: evt.message.slice(0, 120) });
          break;
        case "thinking":
        case "done":
          break;
      }
    }
  }, [agent, busy, input, patchLastAgentTurn]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newSession = useCallback(() => {
    setMeta((m) => ({ ...m, sessionId: null, missions: 0, costUsd: 0, outputTokens: 0 }));
    setTurns([]);
  }, []);

  return (
    <div className="panel flex h-full min-h-0 flex-col overflow-hidden">
      {/* header strip */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="panel-title">console · {agent.callsign}</span>
        <div className="flex items-center gap-2">
          {meta.sessionId && (
            <span className="chip" title={meta.sessionId}>
              session {meta.sessionId.slice(0, 8)}
            </span>
          )}
          <button
            onClick={newSession}
            className="chip transition-colors hover:border-line-bright hover:text-ink"
          >
            new session
          </button>
        </div>
      </div>

      {/* transcript */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={clsx("font-mono text-sm", accent.text)}
            >
              ▚▞ CHANNEL OPEN ▚▞
            </motion.p>
            <p className="max-w-xs text-xs text-faint">
              Transmit a directive to {agent.name}. Streaming replies, tool activity and
              mission cost land here in real time.
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {turns.map((turn) => (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={clsx("flex", turn.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={clsx(
                  "max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                  turn.role === "user"
                    ? "border-pulse/25 bg-pulse/10"
                    : "border-line bg-raised/70",
                )}
              >
                {turn.tools.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {turn.tools.map((tool, i) => (
                      <span key={i} className="chip !text-[10px]" title={tool.detail}>
                        <span className={accent.text}>⚙</span> {tool.name}
                      </span>
                    ))}
                  </div>
                )}
                {turn.text ? (
                  <p className={clsx("whitespace-pre-wrap break-words", turn.streaming && "caret")}>
                    {turn.text}
                  </p>
                ) : turn.streaming ? (
                  <p className={clsx("font-mono text-xs", accent.text)}>
                    <Ellipsis /> working
                  </p>
                ) : null}
                {turn.error && (
                  <p className="mt-2 rounded-lg border border-alert/30 bg-alert/10 px-3 py-2 font-mono text-xs text-alert">
                    {turn.error}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* composer */}
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-raised/70 px-3 py-2 focus-within:border-line-bright">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Directive for ${agent.name}…  (Enter to transmit, Shift+Enter for newline)`}
            rows={Math.min(5, Math.max(1, input.split("\n").length))}
            className="max-h-40 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-faint"
          />
          {busy ? (
            <button
              onClick={stop}
              className="rounded-lg border border-alert/40 bg-alert/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-alert transition-colors hover:bg-alert/20"
            >
              abort
            </button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={send}
              disabled={!input.trim()}
              className={clsx(
                "rounded-lg border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-all disabled:opacity-30",
                "border-pulse/40 bg-pulse/10 text-pulse hover:bg-pulse/20 hover:shadow-glow-cyan",
              )}
            >
              transmit ▸
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

function Ellipsis() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        >
          ●
        </motion.span>
      ))}
    </span>
  );
}
