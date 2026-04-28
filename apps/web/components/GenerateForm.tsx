"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { generateNewProblem, type GenerateState } from "../app/actions";

const INITIAL_STATE: GenerateState = { status: "idle", message: "" };

export function GenerateForm() {
  const [state, formAction] = useActionState(generateNewProblem, INITIAL_STATE);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label
            htmlFor="difficulty"
            className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Difficulty
          </label>
          <select
            id="difficulty"
            name="difficulty"
            defaultValue="medium"
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col">
          <label
            htmlFor="topic"
            className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Topic
          </label>
          <input
            id="topic"
            name="topic"
            type="text"
            defaultValue="arrays"
            placeholder="e.g. arrays, two-pointer, dynamic programming"
            className="min-w-[20rem] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
            required
          />
        </div>
        <SubmitButton />
      </div>
      {state.status === "error" && (
        <p className="mt-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
          {state.message}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Generation runs the configured generator + validator LLMs and the sandbox. Expect ~1 minute
        on a local model.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
    >
      {pending ? "Generating…" : "Generate problem"}
    </button>
  );
}
