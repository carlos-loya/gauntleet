"use client";

import Editor from "@monaco-editor/react";
import { CheckCircle2, Loader2, Play, RotateCcw, Send, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { GradeResult } from "@gauntleet/core";
import { runUserCodeAction, submitUserCodeAction } from "../app/actions";
import { ResultsPanel } from "./ResultsPanel";

interface ProblemEditorProps {
  problemId: string;
  starterCode: string;
}

type Mode = "run" | "submit";

interface PanelState {
  mode: Mode;
  grade: GradeResult;
}

export function ProblemEditor({ problemId, starterCode }: ProblemEditorProps) {
  const storageKey = `gauntleet:code:${problemId}`;
  const [code, setCode] = useState<string>(starterCode);
  const [hydrated, setHydrated] = useState(false);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<Mode | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved !== null) setCode(saved);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, code);
  }, [code, hydrated, storageKey]);

  function handleReset() {
    if (confirm("Reset the editor to the starter code? Your current code will be discarded.")) {
      setCode(starterCode);
      setPanel(null);
      setError(null);
    }
  }

  function trigger(mode: Mode) {
    setActiveAction(mode);
    setError(null);
    startTransition(async () => {
      const result =
        mode === "run"
          ? await runUserCodeAction(problemId, code)
          : await submitUserCodeAction(problemId, code);
      if (result.ok) {
        setPanel({ mode, grade: result.grade });
      } else {
        setPanel(null);
        setError(result.error);
      }
      setActiveAction(null);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono">python 3.12</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span>auto-saved to this browser</span>
        </span>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            tabSize: 4,
            insertSpaces: true,
            automaticLayout: true,
            fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
      </div>
      {(panel || error) && (
        <div className="max-h-[40vh] flex-shrink-0 overflow-y-auto border-t border-slate-200 dark:border-slate-800">
          {error ? (
            <div className="flex items-start gap-2 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-medium">Error</div>
                <pre className="mt-0.5 whitespace-pre-wrap font-mono text-xs">{error}</pre>
              </div>
            </div>
          ) : panel ? (
            <ResultsPanel mode={panel.mode} grade={panel.grade} />
          ) : null}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isPending && activeAction ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {activeAction === "run" ? "Running sample tests…" : "Grading submission…"}
            </span>
          ) : panel?.grade.verdict === "accepted" ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {panel.mode === "submit"
                ? `Accepted · ${panel.grade.testsTotal} tests passed`
                : `All ${panel.grade.testsTotal} sample tests passed`}
            </span>
          ) : (
            <>Run probes the sample tests · Submit grades against random inputs</>
          )}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => trigger("run")}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            {isPending && activeAction === "run" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run
          </button>
          <button
            type="button"
            onClick={() => trigger("submit")}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isPending && activeAction === "submit" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
