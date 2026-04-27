import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { SandboxError, type RunPythonOptions, type RunPythonResult } from "./types.js";

const DEFAULTS = {
  timeoutMs: 5000,
  memoryMb: 256,
  cpus: 1,
  pidsLimit: 64,
  image: "gauntleet-python-runner:latest",
};

const MAX_OUTPUT_BYTES = 1_048_576; // 1 MiB cap per stream

export async function runPython(opts: RunPythonOptions): Promise<RunPythonResult> {
  const cfg = {
    timeoutMs: opts.timeoutMs ?? DEFAULTS.timeoutMs,
    memoryMb: opts.memoryMb ?? DEFAULTS.memoryMb,
    cpus: opts.cpus ?? DEFAULTS.cpus,
    pidsLimit: opts.pidsLimit ?? DEFAULTS.pidsLimit,
    image: opts.image ?? DEFAULTS.image,
  };
  const containerName = `gauntleet-${randomBytes(6).toString("hex")}`;

  const dockerArgs = [
    "run",
    "--rm",
    "--name",
    containerName,
    "--network",
    "none",
    "--read-only",
    "--tmpfs",
    "/tmp:size=64m,mode=1777",
    "--tmpfs",
    "/sandbox:size=8m,mode=1777,uid=65534,gid=65534",
    "--memory",
    `${cfg.memoryMb}m`,
    "--memory-swap",
    `${cfg.memoryMb}m`,
    "--cpus",
    String(cfg.cpus),
    "--pids-limit",
    String(cfg.pidsLimit),
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--user",
    "65534:65534",
    "-i",
    cfg.image,
  ];

  const start = Date.now();

  return new Promise<RunPythonResult>((resolve, reject) => {
    const child = spawn("docker", dockerArgs, { stdio: ["pipe", "pipe", "pipe"] });

    const stdoutBufs: Buffer[] = [];
    const stderrBufs: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let resolved = false;
    let killTimer: NodeJS.Timeout | null = null;
    let spawnFailed = false;

    child.stdout.on("data", (chunk: Buffer) => {
      const room = MAX_OUTPUT_BYTES - stdoutBytes;
      if (room <= 0) {
        stdoutTruncated = true;
        return;
      }
      if (chunk.length > room) {
        stdoutBufs.push(chunk.subarray(0, room));
        stdoutBytes += room;
        stdoutTruncated = true;
      } else {
        stdoutBufs.push(chunk);
        stdoutBytes += chunk.length;
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const room = MAX_OUTPUT_BYTES - stderrBytes;
      if (room <= 0) {
        stderrTruncated = true;
        return;
      }
      if (chunk.length > room) {
        stderrBufs.push(chunk.subarray(0, room));
        stderrBytes += room;
        stderrTruncated = true;
      } else {
        stderrBufs.push(chunk);
        stderrBytes += chunk.length;
      }
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      spawnFailed = true;
      if (killTimer) clearTimeout(killTimer);
      if (resolved) return;
      resolved = true;
      if (err.code === "ENOENT") {
        reject(
          new SandboxError(
            "docker CLI not found on PATH — install Docker or run from a host that has it"
          )
        );
        return;
      }
      reject(err);
    });

    child.on("close", (code) => {
      if (killTimer) clearTimeout(killTimer);
      if (resolved || spawnFailed) return;
      resolved = true;
      const stdout = Buffer.concat(stdoutBufs).toString("utf-8");
      const stderr = Buffer.concat(stderrBufs).toString("utf-8");
      const oom = code === 137 && !timedOut;
      resolve({
        stdout,
        stderr,
        exitCode: code,
        durationMs: Date.now() - start,
        timedOut,
        oom,
        truncated: { stdout: stdoutTruncated, stderr: stderrTruncated },
      });
    });

    killTimer = setTimeout(() => {
      timedOut = true;
      const k = spawn("docker", ["kill", containerName], { stdio: "ignore" });
      k.on("error", () => {
        // best-effort; container may already be gone
      });
    }, cfg.timeoutMs);

    // Pipe protocol header + code + user stdin
    const codeBytes = Buffer.from(opts.code, "utf-8");
    const header = Buffer.from(`GLT:${codeBytes.length}\n`, "utf-8");
    const inputBytes = opts.stdin != null ? Buffer.from(opts.stdin, "utf-8") : Buffer.alloc(0);

    child.stdin.on("error", (err: NodeJS.ErrnoException) => {
      // EPIPE if container exits before we finish writing — not fatal here
      if (err.code === "EPIPE") return;
    });

    child.stdin.write(header);
    child.stdin.write(codeBytes);
    if (inputBytes.length > 0) child.stdin.write(inputBytes);
    child.stdin.end();
  });
}
