"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentConfig, AgentStatus, SystemStats } from "./types";

export function useAgents() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => setAgents([]));
  }, []);
  return agents;
}

export function useAgentStatuses(intervalMs = 15000) {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const d = await fetch("/api/agents/status").then((r) => r.json());
        if (!alive) return;
        const map: Record<string, AgentStatus> = {};
        for (const s of d.statuses ?? []) map[s.id] = s;
        setStatuses(map);
      } catch {
        /* keep last known */
      } finally {
        if (alive) setChecking(false);
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);
  return { statuses, checking };
}

export function useSystemStats(intervalMs = 3000, historyLen = 40) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s: SystemStats = await fetch("/api/system").then((r) => r.json());
        if (!alive) return;
        setStats(s);
        setCpuHistory((h) => [...h, s.cpuPercent].slice(-historyLen));
        setMemHistory((h) => [...h, s.memPercent].slice(-historyLen));
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs, historyLen]);
  return { stats, cpuHistory, memHistory };
}

/* ---------- mission log (activity feed), persisted locally ---------- */

export interface LogEntry {
  ts: number;
  agentId: string;
  kind: "dispatch" | "reply" | "tool" | "error" | "system";
  text: string;
}

const LOG_KEY = "mc.missionLog.v1";
const TALLY_KEY = "mc.tally.v1";

export interface Tally {
  missions: number;
  costUsd: number;
  outputTokens: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}

export function appendLog(entry: Omit<LogEntry, "ts">) {
  const log = read<LogEntry[]>(LOG_KEY, []);
  log.push({ ...entry, ts: Date.now() });
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-200)));
  notify();
}

export function bumpTally(delta: Partial<Tally>) {
  const t = read<Tally>(TALLY_KEY, { missions: 0, costUsd: 0, outputTokens: 0 });
  const next: Tally = {
    missions: t.missions + (delta.missions ?? 0),
    costUsd: t.costUsd + (delta.costUsd ?? 0),
    outputTokens: t.outputTokens + (delta.outputTokens ?? 0),
  };
  localStorage.setItem(TALLY_KEY, JSON.stringify(next));
  notify();
}

export function useMissionLog() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [tally, setTally] = useState<Tally>({ missions: 0, costUsd: 0, outputTokens: 0 });
  useEffect(() => {
    const refresh = () => {
      setLog(read<LogEntry[]>(LOG_KEY, []).slice().reverse());
      setTally(read<Tally>(TALLY_KEY, { missions: 0, costUsd: 0, outputTokens: 0 }));
    };
    refresh();
    listeners.add(refresh);
    window.addEventListener("storage", refresh);
    return () => {
      listeners.delete(refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return { log, tally };
}

/* ---------- misc ---------- */

export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function usePrevious<T>(value: T) {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export const ACCENTS = {
  cyan: {
    text: "text-pulse",
    dot: "bg-pulse",
    glow: "shadow-glow-cyan",
    glowHover: "hover:shadow-glow-cyan",
    glowGroupHover: "group-hover:shadow-glow-cyan",
    border: "hover:border-pulse/40",
    series: "#0891b2",
    bright: "#22d3ee",
  },
  amber: {
    text: "text-ember",
    dot: "bg-ember",
    glow: "shadow-glow-amber",
    glowHover: "hover:shadow-glow-amber",
    glowGroupHover: "group-hover:shadow-glow-amber",
    border: "hover:border-ember/40",
    series: "#d97706",
    bright: "#fbbf24",
  },
  rose: {
    text: "text-rose",
    dot: "bg-rose",
    glow: "shadow-glow-rose",
    glowHover: "hover:shadow-glow-rose",
    glowGroupHover: "group-hover:shadow-glow-rose",
    border: "hover:border-rose/40",
    series: "#ec4899",
    bright: "#f472b6",
  },
  mint: {
    text: "text-mint",
    dot: "bg-mint",
    glow: "shadow-glow-mint",
    glowHover: "hover:shadow-glow-mint",
    glowGroupHover: "group-hover:shadow-glow-mint",
    border: "hover:border-mint/40",
    series: "#16a34a",
    bright: "#4ade80",
  },
} as const;
