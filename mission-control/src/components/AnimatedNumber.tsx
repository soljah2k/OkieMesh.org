"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);
  const first = useRef(true);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: first.current ? 1.1 : 0.5,
      ease: [0.22, 1, 0.36, 1],
    });
    first.current = false;
    return controls.stop;
  }, [value, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}
