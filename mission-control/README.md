# ◉ Mission Control

A locally-hosted AI operations deck. Command **Claude** through the Claude Code CLI
bridge, and drive your other agents (OpenClaw, Hermes, …) from their own consoles —
all from one gorgeous dashboard.

Built with **Next.js + Tailwind + Framer Motion**. Everything runs on `127.0.0.1`;
nothing leaves your machine except what your agents themselves do.

## Quick start

```bash
cd mission-control
npm install
npm run dev
```

Open **http://127.0.0.1:4477**.

Requirements:

- Node.js 18.18+ (20+ recommended)
- [Claude Code CLI](https://code.claude.com/docs) installed and authenticated
  (`claude` must be on your PATH — check with `claude --version`)

## What's inside

| Area | What it does |
| --- | --- |
| **Overview** | Fleet status (live probes), mission tally + spend, host CPU/memory vitals with sparklines, and a rolling mission log |
| **Agent consoles** | One console per agent. Streaming replies, tool-call chips, session telemetry (cost, tokens, duration, session id) |
| **Claude bridge** | Spawns `claude -p --output-format stream-json --include-partial-messages`; tokens stream to the browser as they're generated. Follow-ups resume the same session via `--resume` |
| **Generic bridges** | Other agents connect via a local CLI command or an HTTP endpoint — both stream |

## Adding / editing agents

Edit `config/agents.json` — no code changes needed:

```jsonc
{
  "id": "hermes",            // route: /agents/hermes
  "name": "Hermes",
  "callsign": "COURIER",     // shows in the UI
  "tagline": "what this agent does",
  "kind": "http",            // "claude-cli" | "cli" | "http"
  "accent": "rose",          // cyan | amber | rose | mint
  "url": "http://127.0.0.1:8788/chat",   // for kind http (POST { prompt })
  "healthUrl": "http://127.0.0.1:8788/health"
}
```

- `kind: "cli"` runs `command` locally with the prompt substituted for `{prompt}`
  (or appended), streaming stdout. e.g. `"command": "openclaw agent --message {prompt}"`
- `kind: "http"` POSTs `{ "prompt": "..." }` as JSON to `url` and streams the body.
- `healthCommand` / `healthUrl` power the online/offline probes.

The default registry ships with Claude (live via the CLI bridge) plus OpenClaw and
Hermes stubs — they'll show **NO CARRIER** until you point them at a real command
or endpoint.

## Security notes

- The dev/start scripts bind to `127.0.0.1` only. Don't expose this port —
  the Claude bridge executes an agent with your local credentials.
- Bridge commands come **only** from `config/agents.json` on disk. The browser can
  send prompt text, never commands, and prompts are passed as a single argv value
  (no shell interpolation).
- Claude runs with its default permission mode; it will not take privileged
  actions without the permissions you've configured in Claude Code itself.

## Stack

- [Next.js 15](https://nextjs.org) (App Router, streaming route handlers)
- [Tailwind CSS](https://tailwindcss.com) — custom command-deck theme
- [Framer Motion](https://motion.dev) — the dopamine
- Chart accent palette validated for contrast + color-vision-deficiency
  separation against the dark surface
