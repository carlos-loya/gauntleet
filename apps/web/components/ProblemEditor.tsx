"use client";

import Editor from "@monaco-editor/react";
import { Play, RotateCcw, Send } from "lucide-react";
import { useEffect, useState } from "react";

interface ProblemEditorProps {
  problemId: string;
  starterCode: string;
}

export function ProblemEditor({ problemId, starterCode }: ProblemEditorProps) {
  const storageKey = `gauntleet:code:${problemId}`;
  const [code, setCode] = useState<string>(starterCode);
  const [hydrated, setHydrated] = useState(false);

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
    }
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
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Run + Submit land in PR&nbsp;#7
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            title="Coming in PR #7"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
          <button
            type="button"
            disabled
            title="Coming in PR #7"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md bg-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-500"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
