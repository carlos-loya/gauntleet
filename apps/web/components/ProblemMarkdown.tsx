import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ProblemMarkdown({ children }: { children: string }) {
  return (
    <article className="prose prose-slate max-w-none dark:prose-invert prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </article>
  );
}
