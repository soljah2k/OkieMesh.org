"use client";

import clsx from "clsx";

export function StatusDot({
  online,
  checking = false,
  className,
}: {
  online: boolean;
  checking?: boolean;
  className?: string;
}) {
  const color = checking ? "bg-faint" : online ? "bg-mint" : "bg-alert";
  return (
    <span className={clsx("relative inline-flex h-2 w-2", className)}>
      {online && !checking && (
        <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-mint" />
      )}
      <span className={clsx("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}
