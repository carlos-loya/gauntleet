"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import { TOPICS, topicLabel, type Topic } from "@gauntleet/core/topics";
import { generateNewProblem, type GenerateState } from "../app/actions";

const INITIAL_STATE: GenerateState = { status: "idle", message: "" };

interface GenerateFormProps {
  defaultDifficulty?: "easy" | "medium" | "hard";
  defaultTopic?: Topic;
}

export function GenerateForm({
  defaultDifficulty = "medium",
  defaultTopic = "arrays",
}: GenerateFormProps = {}) {
  const [state, formAction] = useActionState(generateNewProblem, INITIAL_STATE);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[10rem_1fr_auto] md:items-end">
        <Field label="Difficulty" htmlFor="difficulty">
          <select
            id="difficulty"
            name="difficulty"
            defaultValue={defaultDifficulty}
            className={selectStyles}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>
        <Field label="Topic" htmlFor="topic">
          <select id="topic" name="topic" defaultValue={defaultTopic} className={selectStyles}>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {topicLabel(t)}
              </option>
            ))}
          </select>
        </Field>
        <SubmitButton />
      </div>
      {state.status === "error" && (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-400/20">
          {state.message}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Runs the configured generator + validator LLMs and the sandbox. Expect ~1 minute on a local
        model. The validator independently solves the problem and the result is rejected if the two
        solutions disagree.
      </p>
    </form>
  );
}

const selectStyles =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/20 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-slate-600 dark:focus:border-slate-500";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate problem
        </>
      )}
    </button>
  );
}
