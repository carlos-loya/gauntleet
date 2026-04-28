"use client";

import Editor from "@monaco-editor/react";
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
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>Python 3.12 — your code is auto-saved to this browser</span>
        <button
          type="button"
          onClick={handleReset}
          className="rounded px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-800"
        >
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
          }}
        />
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Run + Submit land in PR #7 (submission judging).
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            title="Coming in PR #7"
            className="cursor-not-allowed rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500"
          >
            Run
          </button>
          <button
            type="button"
            disabled
            title="Coming in PR #7"
            className="cursor-not-allowed rounded-md bg-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-500"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
