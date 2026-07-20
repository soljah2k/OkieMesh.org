"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ACCENTS, useAgents, useAgentStatuses, useClock } from "@/lib/client";
import { StatusDot } from "./StatusDot";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const agents = useAgents();
  const { statuses, checking } = useAgentStatuses();
  const now = useClock();
  const onlineCount = Object.values(statuses).filter((s) => s.online).length;

  return (
    <div className="flex min-h-screen">
      {/* ---- sidebar ---- */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-line bg-surface/70 backdrop-blur-md md:flex">
        <Link href="/" className="flex items-center gap-3 px-5 py-5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-pulse/30 bg-pulse/10 shadow-glow-cyan">
            <span className="font-mono text-sm font-bold text-pulse">◉</span>
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight tracking-wide">
              MISSION CONTROL
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              okiemesh · local ops
            </span>
          </span>
        </Link>

        <nav className="mt-2 flex-1 space-y-6 overflow-y-auto px-3">
          <div>
            <p className="panel-title px-2 pb-2">Command</p>
            <NavLink href="/" active={pathname === "/"} label="Overview" icon="⌂" />
          </div>
          <div>
            <p className="panel-title px-2 pb-2">Agent Fleet</p>
            {agents.map((a) => {
              const accent = ACCENTS[a.accent] ?? ACCENTS.cyan;
              const st = statuses[a.id];
              const href = `/agents/${a.id}`;
              return (
                <NavLink
                  key={a.id}
                  href={href}
                  active={pathname === href}
                  label={a.name}
                  icon={
                    <StatusDot online={Boolean(st?.online)} checking={checking && !st} />
                  }
                  trailing={
                    <span className={clsx("font-mono text-[10px]", accent.text)}>
                      {a.callsign}
                    </span>
                  }
                />
              );
            })}
          </div>
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            fleet status
          </p>
          <p className="mt-1 font-mono text-xs text-muted">
            <span className="text-mint">{onlineCount}</span>
            <span className="text-faint"> / {agents.length} agents online</span>
          </p>
        </div>
      </aside>

      {/* ---- main ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-void/70 px-5 py-3 backdrop-blur-md md:px-8">
          <Link href="/" className="md:hidden">
            <span className="font-mono text-xs font-bold tracking-widest text-pulse">
              ◉ MISSION CONTROL
            </span>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              LOCAL LINK SECURE
            </span>
            <span className="chip">127.0.0.1:4477</span>
          </div>
          <div className="flex items-center gap-4">
            <span
              className="font-mono text-xs tabular-nums text-muted"
              suppressHydrationWarning
            >
              {now
                ? now.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--:--:--"}
            </span>
          </div>
        </header>

        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 flex-1 px-5 py-6 md:px-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  active,
  label,
  icon,
  trailing,
}: {
  href: string;
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group relative mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active ? "text-ink" : "text-muted hover:bg-raised/60 hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-xl border border-pulse/25 bg-pulse/10"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative flex w-4 items-center justify-center text-xs">{icon}</span>
      <span className="relative flex-1">{label}</span>
      {trailing && <span className="relative">{trailing}</span>}
    </Link>
  );
}
