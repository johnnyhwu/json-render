"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JSONUIProvider, Renderer, useStateValue } from "@json-render/react";
import type { Spec } from "@json-render/core";
import { registry } from "@/lib/render/registry";
import { examples } from "@/lib/specs";
import { accounts, bridge, deals, funnel, sales } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Order elements parent-first so a replay looks like a real model stream. */
function streamOrder(spec: Spec): string[] {
  const out: string[] = [];
  const visit = (key: string) => {
    const el = spec.elements[key];
    if (!el || out.includes(key)) return;
    out.push(key);
    el.children?.forEach(visit);
  };
  visit(spec.root);
  return out;
}

function LiveState() {
  const filters = useStateValue<Record<string, unknown>>("/filters");
  return (
    <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed">
      {JSON.stringify({ filters }, null, 2)}
    </pre>
  );
}

export default function Page() {
  const [index, setIndex] = useState(0);
  const [showSpec, setShowSpec] = useState(true);
  const [dark, setDark] = useState(false);
  const example = examples[index]!;

  // Streaming replay: reveal elements one by one, as a model would emit them.
  const order = useMemo(() => streamOrder(example.spec), [example]);
  const [revealed, setRevealed] = useState(order.length);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const streaming = revealed < order.length;

  useEffect(() => {
    setRevealed(order.length);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [order]);

  const replay = () => {
    if (timer.current) clearInterval(timer.current);
    setRevealed(1);
    timer.current = setInterval(() => {
      setRevealed((n) => {
        if (n + 1 >= order.length && timer.current)
          clearInterval(timer.current);
        return n + 1;
      });
    }, 160);
  };

  const visibleSpec: Spec = useMemo(() => {
    const keys = new Set(order.slice(0, revealed));
    const elements = Object.fromEntries(
      Object.entries(example.spec.elements)
        .filter(([k]) => keys.has(k))
        .map(([k, el]) => [
          k,
          el.children
            ? { ...el, children: el.children.filter((c) => keys.has(c)) }
            : el,
        ]),
    );
    return { ...example.spec, elements };
  }, [example, order, revealed]);

  // Data comes from the host (e.g. a tool result), not from the model.
  const initialState = useMemo(
    () => ({
      ...(example.spec.state ?? {}),
      data: { sales, accounts, deals, funnel, bridge },
    }),
    [example],
  );

  const specJson = JSON.stringify(example.spec, null, 2);
  const specBytes = new Blob([JSON.stringify(example.spec)]).size;

  return (
    <div className={cn("bg-background", dark && "dark")}>
      <div className="min-h-screen bg-muted/40 text-foreground">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-6 py-3">
            <span className="mr-2 text-sm font-semibold">
              json-render charts
            </span>
            <nav className="flex gap-1 rounded-lg bg-muted p-0.5">
              {examples.map((ex, i) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm transition-colors",
                    i === index
                      ? "bg-background font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ex.name}
                </button>
              ))}
            </nav>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={replay}
                disabled={streaming}
                className="rounded-md border bg-background px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
              >
                {streaming
                  ? `Streaming ${revealed}/${order.length}`
                  : "Replay as stream"}
              </button>
              <button
                type="button"
                onClick={() => setShowSpec((s) => !s)}
                className="rounded-md border bg-background px-3 py-1 text-sm hover:bg-muted"
              >
                {showSpec ? "Hide spec" : "Show spec"}
              </button>
              <button
                type="button"
                onClick={() => setDark((d) => !d)}
                className="rounded-md border bg-background px-3 py-1 text-sm hover:bg-muted"
              >
                {dark ? "Light" : "Dark"}
              </button>
            </div>
          </div>
        </header>

        <JSONUIProvider
          key={index}
          registry={registry}
          initialState={initialState}
        >
          <main className="mx-auto flex max-w-[1440px] gap-6 px-6 py-6">
            <div className="min-w-0 flex-1 space-y-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Prompt
                </span>
                <p className="text-sm text-muted-foreground">
                  {example.prompt}
                </p>
              </div>
              <Renderer
                spec={visibleSpec}
                registry={registry}
                loading={streaming}
              />
            </div>

            {showSpec && (
              <aside className="hidden w-[400px] shrink-0 xl:block">
                <div className="sticky top-20 space-y-4">
                  <section className="rounded-xl border bg-card p-4">
                    <h2 className="text-sm font-semibold">Live state</h2>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Filter pills, bar clicks, and slice clicks all write here.
                    </p>
                    <LiveState />
                  </section>
                  <section className="rounded-xl border bg-card p-4">
                    <h2 className="text-sm font-semibold">
                      Spec the agent emitted
                    </h2>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {Object.keys(example.spec.elements).length} elements,{" "}
                      {(specBytes / 1024).toFixed(1)} KB. No colors, no data
                      rows.
                    </p>
                    <pre className="max-h-[calc(100vh-22rem)] overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-[11px] leading-relaxed">
                      {specJson}
                    </pre>
                  </section>
                </div>
              </aside>
            )}
          </main>
        </JSONUIProvider>
      </div>
    </div>
  );
}
