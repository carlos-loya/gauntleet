export interface RunPythonOptions {
  code: string;
  stdin?: string;
  timeoutMs?: number;
  memoryMb?: number;
  cpus?: number;
  pidsLimit?: number;
  image?: string;
}

export interface RunPythonResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  oom: boolean;
  truncated: { stdout: boolean; stderr: boolean };
}

export class SandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxError";
  }
}
