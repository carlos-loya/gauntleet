# Gauntleet

A LeetCode-style algorithm practice site where every problem is generated and verified by AI.

The interesting bit isn't generation — it's **verification**. A generator model writes the problem and a reference solution. A separate validator model independently solves the same problem. Both solutions run inside a Docker-isolated Python sandbox against random inputs from a generated test-case function. Disagreement means the problem is rejected before a user ever sees it.

Local-first MVP, intended as a portfolio piece. Everything runs on your machine — no hosted services, no auth, your API keys stay in `.env.local`.

## Why this is interesting

Asking an LLM "give me a hard graph problem" produces problems that look right but quietly contain bugs: off-by-one constraints, undefined behavior on edge cases, sample tests that disagree with the reference solution. You don't notice until you're 30 minutes into a wrong problem.

The fix is structural: never trust a single model's output.

```
            ┌──────────────┐
            │  Generator   │  writes problem + reference solution + input generator
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │   Sandbox    │  reference must pass its own sample tests
            └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  Validator   │  independently solves the same problem
            └──────┬───────┘
                   │
                   ▼
   ┌───────────────────────────────────┐
   │  Sandbox runs both on N random    │
   │  inputs from the input generator  │
   │  → outputs must agree byte-exact  │
   └───────────────┬───────────────────┘
                   │
                   ▼
            ┌──────────────┐
            │   SQLite     │  store as validated, or reject
            └──────────────┘
```

For cross-validation to mean anything, the two models must be **independent** — same training data and same biases means they fail in the same ways. The factory exposes a `familyId` so we warn loudly when generator and validator share a backend.

## Stack

- **Next.js 15** + React 19 + TypeScript + Tailwind v4 (Geist sans/mono, lucide-react, Monaco editor)
- **Drizzle ORM** + **SQLite** (`better-sqlite3`), migrations committed
- **Docker** sandbox per execution: `--network=none`, `--read-only`, tmpfs `/tmp` + `/sandbox`, `--memory` + `--memory-swap` (no swap), `--cpus`, `--pids-limit`, `--cap-drop=ALL`, `--security-opt no-new-privileges`, `--user 65534:65534`, plus a host-side `docker kill` timer
- **Pluggable LLM providers**: Anthropic SDK + OpenAI-compatible (covers OpenAI, LM Studio, Ollama, anything that speaks the OpenAI Chat Completions API)
- **Vitest** for unit tests; smoke scripts for the sandbox + provider integration

## Quickstart

```bash
# 1. Install deps (pnpm only — workspace uses pnpm filters and lockfile)
pnpm install

# 2. Configure providers (see .env.example for the full template)
cp .env.example .env.local
$EDITOR .env.local

# 3. Build the Python sandbox image (one-time, then on Dockerfile changes)
pnpm sandbox:build

# 4. Generate a problem
pnpm gen --difficulty=easy --topic=arrays

# 5. Run the web UI
pnpm dev
# → http://localhost:3000
```

Pick **different model families** for generator and validator — the whole point is that they don't share biases. A reasonable starter pair: a frontier API model for the generator (Anthropic / OpenAI) and a local model via LM Studio or Ollama for the validator. Free local-only setups work too, but expect the cross-validation signal to be weak when both sides use the same family.

## Provider configuration

Two roles — `GENERATOR` and `VALIDATOR`. Each is configured via env vars:

```
{ROLE}_PROVIDER   # anthropic | openai | lmstudio | ollama | custom
{ROLE}_MODEL      # required
{ROLE}_BASE_URL   # optional override; preset has a default
{ROLE}_API_KEY    # optional override; preset has a default
```

| preset      | base URL                    | api key                        |
| ----------- | --------------------------- | ------------------------------ |
| `anthropic` | (uses Anthropic SDK)        | `ANTHROPIC_API_KEY`            |
| `openai`    | `https://api.openai.com/v1` | `OPENAI_API_KEY`               |
| `lmstudio`  | `http://localhost:1234/v1`  | `lm-studio` (any string works) |
| `ollama`    | `http://localhost:11434/v1` | `ollama` (any string works)    |
| `custom`    | must supply `BASE_URL`      | must supply `API_KEY`          |

Provider, model, and base URL can also be overridden at runtime from the **Settings** page. API keys are intentionally never written to the database — they only live in `.env.local`.

## Daily commands

| Command                                     | What it does                                |
| ------------------------------------------- | ------------------------------------------- |
| `pnpm dev`                                  | Next.js dev server                          |
| `pnpm gen --difficulty=easy --topic=arrays` | Generate one problem, validate it, persist  |
| `pnpm test`                                 | Vitest unit tests                           |
| `pnpm typecheck`                            | TypeScript across the workspace             |
| `pnpm lint`                                 | ESLint                                      |
| `pnpm format`                               | Prettier (write)                            |
| `pnpm build`                                | Build the Next app                          |
| `pnpm sandbox:build`                        | Build the Python runner Docker image        |
| `pnpm sandbox:smoke`                        | Adversarial sandbox tests (network, OOM, …) |
| `pnpm --filter @gauntleet/llm smoke`        | Ping providers + run independence check     |

## Project layout

```
apps/web/              # Next.js app (problem list, problem page, settings)
packages/
  core/                # Generation + validation + grading orchestration
  llm/                 # LLMProvider abstraction (anthropic + openai-compatible)
  sandbox/             # Docker-based Python execution
  db/                  # Drizzle + SQLite schema, migrations
docker/python-runner/  # Sandbox image (Dockerfile + runner.py harness)
data/                  # SQLite file (gitignored)
.env.local             # Local config (gitignored, repo root)
```

## What's there

- Generate validated problems by topic + difficulty, with prompt-side dedup against existing titles
- Run / Submit user code through the sandbox with per-test feedback (sample tests for Run, sample + N random for Submit)
- Status indicators: solved / attempted / not started, derived from submission history
- Filter chips for status, difficulty, and topic — URL-driven so views are shareable
- Settings page for default difficulty + topic, per-role model overrides, sandbox limits, and a read-only `.env.local` snapshot

## What's intentionally out of scope

Everything tracked as [post-mvp issues](https://github.com/carlos-loya/gauntleet/issues?q=is%3Aopen+label%3Apost-mvp): more languages, design problems, multi-valid-output problems, hosted sandbox, auth, deploy, leaderboards, structured-output JSON, sandbox container reuse, authoritative OOM detection.

## Conventions

If you fork this and want to send a PR, the working notes live in [CLAUDE.md](./CLAUDE.md). Highlights: pnpm only, feature branches via PRs, Vitest tests required for new pure logic, strict TypeScript (`noUncheckedIndexedAccess: true`), don't loosen sandbox isolation flags. CI runs format + typecheck + lint + tests + build on every PR, plus the sandbox smoke suite.

## License

MIT
