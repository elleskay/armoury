"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

const POLL_INTERVAL_MS = 60_000;

export function VersionBanner() {
  const [initial, setInitial] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchVersion(): Promise<string | null> {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return null;
        const j = (await r.json()) as { version?: string };
        return j.version ?? null;
      } catch {
        return null;
      }
    }
    (async () => {
      const v = await fetchVersion();
      if (!cancelled && v) setInitial(v);
    })();
    const id = window.setInterval(async () => {
      const v = await fetchVersion();
      if (!cancelled && v && initial && v !== initial) setStale(true);
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [initial]);

  if (!stale) return null;

  return (
    <div
      role="alert"
      data-testid="version-banner"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        A new version of Armoury is live. Reload to get the latest fixes.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900"
      >
        Reload
      </button>
    </div>
  );
}
