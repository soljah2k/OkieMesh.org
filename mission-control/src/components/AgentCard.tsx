"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { AgentConfig, AgentStatus } from "@/lib/types";
import { ACCENTS } from "@/lib/client";
import { StatusDot } from "./StatusDot";

export function AgentCard({
  agent,
  status,
  checking,
  delay = 0,
}: {
  agent: AgentConfig;
  status?: AgentStatus;
  checking: boolean;
  delay?: number;
}) {
  const accent = ACCENTS[agent.accent] ?? ACCENTS.cyan;
  const online = Boolean(status?.online);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`/agents/${agent.id}`}
        className={clsx(
          "panel group block p-5 transition-all duration-300",
          accent.border,
          online && accent.glowHover,
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-raised font-mono text-lg font-bold transition-shadow duration-300",
                accent.text,
                online && accent.glowGroupHover,
              )}
            >
              {agent.name.charAt(0)}
            </span>
            <div>
              <p className="text-sm font-semibold">{agent.name}</p>
              <p className={clsx("font-mono text-[10px] uppercase tracking-[0.2em]", accent.text)}>
                {agent.callsign}
              </p>
            </div>
          </div>
          <span className="chip">
            <StatusDot online={online} checking={checking && !status} />
            {checking && !status ? "PROBING" : online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">{agent.tagline}</p>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
            {agent.kind === "claude-cli" ? "claude code bridge" : agent.kind === "cli" ? "local cli" : "http endpoint"}
          </span>
          <span className="font-mono text-[10px] text-faint">
            {status?.detail ? status.detail.slice(0, 34) : "—"}
          </span>
        </div>

        <div
          className={clsx(
            "mt-4 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            accent.text,
          )}
        >
          open console <span aria-hidden>→</span>
        </div>
      </Link>
    </motion.div>
  );
}
