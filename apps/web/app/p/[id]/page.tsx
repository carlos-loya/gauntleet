import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Cpu } from "lucide-react";
import { topicLabel, type Topic } from "@gauntleet/core/topics";
import { DifficultyBadge } from "../../../components/DifficultyBadge";
import { Header } from "../../../components/Header";
import { ProblemEditor } from "../../../components/ProblemEditor";
import { ProblemMarkdown } from "../../../components/ProblemMarkdown";
import { SampleTests } from "../../../components/SampleTests";
import { getProblem } from "../../../lib/db";
import { formatStarterCode } from "../../../lib/problem-format";

export const dynamic = "force-dynamic";

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = getProblem(id);
  if (!problem) notFound();

  const starterCode = formatStarterCode({
    functionName: problem.functionName,
    parameters: problem.parameters,
    returnType: problem.returnType,
  });

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Problems
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
            {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty} />
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {topicLabel(problem.topic as Topic)}
          </span>
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-slate-400 md:inline-flex dark:text-slate-500">
          <Cpu className="h-3.5 w-3.5" />
          {problem.generatorModel}
        </span>
      </div>
      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <section className="overflow-y-auto border-slate-200 px-6 py-6 md:border-r dark:border-slate-800">
          <ProblemMarkdown>{problem.statement}</ProblemMarkdown>
          <h3 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Sample tests
          </h3>
          <SampleTests tests={problem.sampleTests} />
          <h3 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Submissions
          </h3>
          <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Submission history will appear here once judging is wired up (PR&nbsp;#7).
          </p>
        </section>
        <section className="min-h-0">
          <ProblemEditor problemId={problem.id} starterCode={starterCode} />
        </section>
      </main>
    </div>
  );
}
