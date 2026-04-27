import { runPython, type RunPythonResult } from "../src/index.js";

interface Case {
  name: string;
  code: string;
  stdin?: string;
  timeoutMs?: number;
  memoryMb?: number;
  expect: (r: RunPythonResult) => string | null;
}

const cases: Case[] = [
  {
    name: "hello world",
    code: 'print("hello")',
    expect: (r) =>
      r.exitCode === 0 && r.stdout.trim() === "hello"
        ? null
        : `expected exit=0 stdout="hello", got ${describe(r)}`,
  },
  {
    name: "stdin pass-through",
    code: "import sys\nprint(sys.stdin.read().strip())",
    stdin: "ping\n",
    expect: (r) =>
      r.exitCode === 0 && r.stdout.trim() === "ping"
        ? null
        : `expected stdout="ping", got ${describe(r)}`,
  },
  {
    name: "uncaught exception → non-zero exit",
    code: 'raise ValueError("nope")',
    expect: (r) =>
      r.exitCode !== 0 && /ValueError/.test(r.stderr)
        ? null
        : `expected non-zero exit + ValueError in stderr, got ${describe(r)}`,
  },
  {
    name: "infinite loop times out",
    code: "while True: pass",
    timeoutMs: 1500,
    expect: (r) => (r.timedOut ? null : `expected timedOut=true, got ${describe(r)}`),
  },
  {
    name: "fork bomb hits pid limit",
    code:
      "import os\n" +
      "for _ in range(2000):\n" +
      "    try: os.fork()\n" +
      "    except OSError: pass\n",
    timeoutMs: 3000,
    expect: (r) =>
      r.exitCode !== 0 || r.timedOut ? null : `expected pid limit failure, got ${describe(r)}`,
  },
  {
    name: "network is blocked",
    code:
      "import socket\n" +
      "try:\n" +
      "    s = socket.socket()\n" +
      "    s.settimeout(2)\n" +
      "    s.connect(('1.1.1.1', 80))\n" +
      "    print('CONNECTED')\n" +
      "except Exception as e:\n" +
      "    print('BLOCKED', type(e).__name__)\n",
    timeoutMs: 5000,
    expect: (r) =>
      r.stdout.startsWith("BLOCKED") ? null : `network appeared reachable, got ${describe(r)}`,
  },
  {
    name: "writes to /etc are blocked (read-only fs)",
    code:
      "try:\n" +
      "    open('/etc/gauntleet_breach', 'w').write('nope')\n" +
      "    print('WROTE')\n" +
      "except Exception as e:\n" +
      "    print('BLOCKED', type(e).__name__)\n",
    expect: (r) =>
      r.stdout.startsWith("BLOCKED") ? null : `was able to write to /etc, got ${describe(r)}`,
  },
  {
    name: "writes to /tmp are allowed (tmpfs)",
    code:
      "open('/tmp/gauntleet_ok','w').write('ok')\n" + "print(open('/tmp/gauntleet_ok').read())\n",
    expect: (r) =>
      r.exitCode === 0 && r.stdout.trim() === "ok"
        ? null
        : `tmpfs write/read failed, got ${describe(r)}`,
  },
  {
    name: "memory bomb hits memory limit",
    code: "x = bytearray(1024 * 1024 * 512)\nprint('ALLOC')",
    memoryMb: 64,
    expect: (r) =>
      r.exitCode !== 0 && !r.stdout.includes("ALLOC")
        ? null
        : `memory limit not enforced, got ${describe(r)}`,
  },
];

function describe(r: RunPythonResult): string {
  const parts = [
    `exit=${r.exitCode}`,
    `timedOut=${r.timedOut}`,
    `oom=${r.oom}`,
    `dur=${r.durationMs}ms`,
    `stdout=${JSON.stringify(r.stdout.slice(0, 120))}`,
    `stderr=${JSON.stringify(r.stderr.slice(0, 120))}`,
  ];
  return `{ ${parts.join(", ")} }`;
}

async function main(): Promise<void> {
  let failures = 0;
  for (const c of cases) {
    const start = Date.now();
    const result = await runPython({
      code: c.code,
      stdin: c.stdin,
      timeoutMs: c.timeoutMs,
      memoryMb: c.memoryMb,
    });
    const ms = Date.now() - start;
    const failure = c.expect(result);
    if (failure) {
      failures++;
      console.error(`✗ ${c.name} (${ms}ms)\n   ${failure}`);
    } else {
      console.log(`✓ ${c.name} (${ms}ms)`);
    }
  }
  console.log();
  if (failures > 0) {
    console.error(`${failures} sandbox check(s) failed.`);
    process.exit(1);
  }
  console.log("All sandbox checks passed.");
}

main().catch((err) => {
  console.error("smoke test crashed:", err);
  process.exit(1);
});
