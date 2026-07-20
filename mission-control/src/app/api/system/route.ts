import os from "os";
import type { SystemStats } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let lastCpu = cpuTimes();

function cpuTimes() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

export async function GET() {
  const now = cpuTimes();
  const idleDelta = now.idle - lastCpu.idle;
  const totalDelta = now.total - lastCpu.total;
  lastCpu = now;
  const cpuPercent = totalDelta > 0 ? Math.max(0, Math.min(100, 100 * (1 - idleDelta / totalDelta))) : 0;

  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = memTotal - memFree;

  const stats: SystemStats = {
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memUsedGb: Math.round((memUsed / 1e9) * 10) / 10,
    memTotalGb: Math.round((memTotal / 1e9) * 10) / 10,
    memPercent: Math.round((memUsed / memTotal) * 1000) / 10,
    load1: Math.round(os.loadavg()[0] * 100) / 100,
    uptimeSec: Math.round(os.uptime()),
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.arch()}`,
  };
  return Response.json(stats);
}
