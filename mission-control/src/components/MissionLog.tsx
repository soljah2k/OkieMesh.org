"use client";

import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useMissionLog } from "@/lib/client";

const KIND_STYLE: Record<string, { mark: string; cls: string }> = {
  dispatch: { mark: "▸", cls: "text-pulse" },
  reply: { mark: "✓", cls: "text-mint" },
  tool: { mark: "⚙", cls: "text-ember" },
  error: { mark: "✕", cls: "text-alert" },
  system: { mark: "◈", cls: "text-faint" },
};

export function MissionLog({ limit = 14 }: { limit?: number }) {
  const { log } = useMissionLog();
  const entries = log.slice(0, limit);

  return (
    <div className="panel flex h-full min-h-0 flex-col p-0">
      <div className="border-b border-line px-4 py-2.5">
        <span className="panel-title">mission log</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-faint">
            No transmissions yet. Open an agent console and send a directive — every
            dispatch, tool call and result is logged here.
          </p>
        ) : (
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {entries.map((e) => {
                const style = KIND_STYLE[e.kind] ?? KIND_STYLE.system;
                return (
                  <motion.li
                    key={e.ts + e.text.slice(0, 8)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 font-mono text-[11px] hover:bg-raised/60"
                  >
                    <span className="tabular-nums text-faint">
                      {new Date(e.ts).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className={clsx("w-3 text-center", style.cls)}>{style.mark}</span>
                    <span className="uppercase tracking-wider text-muted">{e.agentId}</span>
                    <span className="min-w-0 flex-1 truncate text-ink/80" title={e.text}>
                      {e.text}
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
