"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";

export function StatTile({
  label,
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  sub,
  spark,
  sparkColor = "#0891b2",
  sparkMax,
  delay = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sub?: string;
  spark?: number[];
  sparkColor?: string;
  sparkMax?: number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="panel relative overflow-hidden p-5"
    >
      <p className="panel-title">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight">
        <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </p>
      {sub && <p className="mt-1 text-xs text-faint">{sub}</p>}
      {spark && spark.length > 1 && (
        <div className="absolute bottom-0 right-0 w-28 opacity-80">
          <Sparkline data={spark} color={sparkColor} max={sparkMax} height={34} />
        </div>
      )}
    </motion.div>
  );
}
