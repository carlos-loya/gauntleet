import Link from "next/link";
import { listProblems } from "../lib/db";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { GenerateForm } from "../components/GenerateForm";

export const dynamic = "force-dynamic";

export default function Home() {
  const problems = listProblems();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gauntleet</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          AI-generated algorithmic practice problems.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Generate a new problem
        </h2>
        <GenerateForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Problems ({problems.length})
        </h2>
        {problems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No validated problems yet. Generate one above, or run{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
              pnpm gen --difficulty=easy --topic=arrays
            </code>{" "}
            from the CLI.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Topic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {problems.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/p/${p.id}`}
                        className="text-slate-900 hover:underline dark:text-slate-100"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyBadge difficulty={p.difficulty} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.topic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
