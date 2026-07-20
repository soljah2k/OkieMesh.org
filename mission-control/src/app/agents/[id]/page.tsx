"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Console, type SessionMeta } from "@/components/Console";
import { StatusDot } from "@/components/StatusDot";
import { ACCENTS, useAgents, useAgentStatuses } from "@/lib/client";

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const agents = useAgents();
  const { statuses, checking } = useAgentStatuses();
  const [meta, setMeta] = useState<SessionMeta | null>(null);

  const agent = agents.find((a) => a.id === id);
  if (agents.length > 0 && !agent) {
    return (
      <div className="panel mx-auto mt-16 max-w-md p-8 text-center">
        <p className="font-mono text-sm text-alert">✕ UNKNOWN AGENT</p>
        <p className="mt-2 text-xs text-faint">
          No agent “{id}” in the registry. Add it to config/agents.json and restart.
        </p>
      </div>
    );
  }
  if (!agent) return null;

  const accent = ACCENTS[agent.accent] ?? ACCENTS.cyan;
  const status = statuses[agent.id];
  const online = Boolean(status?.online);

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-7xl flex-col gap-4">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-4">
          <span
            className={clsx(
              "flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-raised font-mono text-xl font-bold",
              accent.text,
              online && accent.glow,
            )}
          >
            {agent.name.charAt(0)}
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {agent.name}{" "}
              <span className={clsx("font-mono text-xs uppercase tracking-[0.25em]", accent.text)}>
                / {agent.callsign}
              </span>
            </h1>
            <p className="text-xs text-muted">{agent.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">
            <StatusDot online={online} checking={checking && !status} />
            {checking && !status ? "PROBING" : online ? "LINK ESTABLISHED" : "NO CARRIER"}
          </span>
          {status?.detail && (
            <span className="chip max-w-[260px] truncate" title={status.detail}>
              {status.detail}
            </span>
          )}
        </div>
      </motion.div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_240px]">
        {/* console */}
        <div className="min-h-0">
          <Console agent={agent} onMeta={setMeta} />
        </div>

        {/* telemetry rail */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="hidden min-h-0 flex-col gap-4 lg:flex"
        >
          <div className="panel p-4">
            <p className="panel-title">session telemetry</p>
            <dl className="mt-3 space-y-3 font-mono text-xs">
              <Telemetry label="missions" value={String(meta?.missions ?? 0)} />
              <Telemetry
                label="spend"
                value={meta && meta.costUsd > 0 ? `$${meta.costUsd.toFixed(4)}` : "$0"}
              />
              <Telemetry
                label="out tokens"
                value={(meta?.outputTokens ?? 0).toLocaleString()}
              />
              <Telemetry
                label="last run"
                value={meta?.lastDurationMs ? `${(meta.lastDurationMs / 1000).toFixed(1)}s` : "—"}
              />
              <Telemetry label="model" value={meta?.model ?? "—"} truncate />
              <Telemetry
                label="session"
                value={meta?.sessionId ? meta.sessionId.slice(0, 13) + "…" : "none"}
                truncate
              />
            </dl>
          </div>

          <div className="panel p-4">
            <p className="panel-title">bridge</p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
              {agent.kind === "claude-cli" && (
                <>
                  Wired to the <span className="text-pulse">Claude Code CLI</span>. Replies
                  stream token-by-token; sessions resume via <span className="text-ink">--resume</span>.
                </>
              )}
              {agent.kind === "cli" && (
                <>
                  Runs <span className="text-ink">{agent.command}</span> on this machine and
                  streams stdout.
                </>
              )}
              {agent.kind === "http" && (
                <>
                  Relays to <span className="text-ink">{agent.url}</span> and streams the
                  response body.
                </>
              )}
            </p>
          </div>

          <div className="panel p-4">
            <p className="panel-title">tips</p>
            <ul className="mt-2 space-y-1.5 font-mono text-[11px] text-faint">
              <li>▸ Enter transmits</li>
              <li>▸ Shift+Enter = newline</li>
              <li>▸ “new session” resets context</li>
              <li>▸ abort kills the process</li>
            </ul>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function Telemetry({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="uppercase tracking-widest text-faint">{label}</dt>
      <dd className={clsx("tabular-nums text-ink", truncate && "max-w-[120px] truncate")} title={value}>
        {value}
      </dd>
    </div>
  );
}
