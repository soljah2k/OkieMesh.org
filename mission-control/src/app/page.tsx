"use client";

import { motion } from "framer-motion";
import { AgentCard } from "@/components/AgentCard";
import { MissionLog } from "@/components/MissionLog";
import { Sparkline } from "@/components/Sparkline";
import { StatTile } from "@/components/StatTile";
import {
  useAgents,
  useAgentStatuses,
  useMissionLog,
  useSystemStats,
} from "@/lib/client";

export default function Overview() {
  const agents = useAgents();
  const { statuses, checking } = useAgentStatuses();
  const { stats, cpuHistory, memHistory } = useSystemStats();
  const { tally } = useMissionLog();

  const online = Object.values(statuses).filter((s) => s.online).length;
  const uptimeHrs = stats ? stats.uptimeSec / 3600 : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-pulse">
          ▚ operations deck
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Mission Control
        </h1>
        <p className="mt-1 text-sm text-muted">
          Local command surface for your AI fleet — Claude on the primary channel,
          auxiliary agents on their own frequencies.
        </p>
      </motion.div>

      {/* stat row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Agents Online"
          value={online}
          suffix={` / ${agents.length || "—"}`}
          sub="fleet reachability, probed every 15s"
          delay={0.05}
        />
        <StatTile
          label="Missions Completed"
          value={tally.missions}
          sub="directives resolved this browser"
          delay={0.1}
        />
        <StatTile
          label="Spend"
          value={tally.costUsd}
          decimals={3}
          prefix="$"
          sub={`${Math.round(tally.outputTokens).toLocaleString()} output tokens`}
          delay={0.15}
        />
        <StatTile
          label="Host Uptime"
          value={uptimeHrs}
          decimals={1}
          suffix=" h"
          sub={stats ? `${stats.hostname} · ${stats.platform}` : "reading host…"}
          delay={0.2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* agent fleet */}
        <div className="space-y-4 lg:col-span-2">
          <p className="panel-title">agent fleet</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {agents.map((agent, i) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                status={statuses[agent.id]}
                checking={checking}
                delay={0.1 + i * 0.07}
              />
            ))}
            {agents.length === 0 && (
              <div className="panel col-span-full p-6 text-center text-xs text-faint">
                Loading fleet registry…
              </div>
            )}
          </div>

          {/* system vitals */}
          <p className="panel-title pt-2">host vitals</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <VitalsPanel
              label="CPU"
              value={stats ? `${stats.cpuPercent.toFixed(1)}%` : "—"}
              sub={stats ? `load ${stats.load1}` : ""}
              data={cpuHistory}
              color="#0891b2"
            />
            <VitalsPanel
              label="Memory"
              value={stats ? `${stats.memUsedGb} / ${stats.memTotalGb} GB` : "—"}
              sub={stats ? `${stats.memPercent.toFixed(1)}% in use` : ""}
              data={memHistory}
              color="#d97706"
            />
          </div>
        </div>

        {/* mission log */}
        <div className="min-h-[320px] lg:col-span-1">
          <MissionLog />
        </div>
      </div>
    </div>
  );
}

function VitalsPanel({
  label,
  value,
  sub,
  data,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  data: number[];
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="panel p-4"
    >
      <div className="flex items-baseline justify-between">
        <span className="panel-title">{label}</span>
        <span className="font-mono text-sm tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-2">
        <Sparkline data={data} color={color} max={100} height={44} className="w-full" />
      </div>
      <p className="mt-1 font-mono text-[10px] text-faint">{sub}</p>
    </motion.div>
  );
}
