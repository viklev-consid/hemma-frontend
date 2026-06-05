"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type LegalMarkdownProps = {
  content: string;
  className?: string;
};

export function LegalMarkdown({ content, className }: LegalMarkdownProps) {
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              {...props}
              className="mt-4 text-base font-semibold text-foreground"
            />
          ),
          h2: (props) => (
            <h2
              {...props}
              className="mt-4 text-sm font-semibold text-foreground"
            />
          ),
          h3: (props) => (
            <h3
              {...props}
              className="mt-3 text-sm font-semibold text-foreground"
            />
          ),
          p: (props) => <p {...props} className="text-muted-foreground" />,
          ul: (props) => (
            <ul
              {...props}
              className="list-disc space-y-1 pl-5 text-muted-foreground"
            />
          ),
          ol: (props) => (
            <ol
              {...props}
              className="list-decimal space-y-1 pl-5 text-muted-foreground"
            />
          ),
          li: (props) => <li {...props} />,
          a: (props) => (
            <a
              {...props}
              className="text-foreground underline underline-offset-2"
              target="_blank"
              rel="noreferrer noopener"
            />
          ),
          code: (props) => (
            <code
              {...props}
              className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
            />
          ),
          blockquote: (props) => (
            <blockquote
              {...props}
              className="border-l-2 border-border pl-3 text-muted-foreground italic"
            />
          ),
          table: (props) => (
            <table
              {...props}
              className="w-full border-collapse border border-border text-xs"
            />
          ),
          th: (props) => (
            <th
              {...props}
              className="border border-border bg-muted px-2 py-1 text-left font-semibold"
            />
          ),
          td: (props) => (
            <td {...props} className="border border-border px-2 py-1" />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
