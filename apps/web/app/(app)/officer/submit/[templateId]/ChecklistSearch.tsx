"use client";

import { useRef, useState } from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ChecklistSearchProps {
  labels: string[];
  children: React.ReactNode[];
}

export function ChecklistSearch({ labels, children }: ChecklistSearchProps) {
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  function selectAllBoolean(value: "yes" | "no") {
    const container = containerRef.current;
    if (!container) return;
    const radios = container.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][value="${value}"]`,
    );
    radios.forEach((el) => {
      if (!el.checked) el.click();
    });
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
            aria-label="Search items"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectAllBoolean("yes")}
            aria-label="Select all Yes"
          >
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
            All Yes
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectAllBoolean("no")}
            aria-label="Select all No"
          >
            <XCircle className="mr-1 h-3.5 w-3.5" />
            All No
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        {(Array.isArray(children) ? children : [children]).map((child, idx) => {
          const label = (labels[idx] ?? "").toLowerCase();
          const visible = q.length === 0 || label.includes(q);
          return (
            <div key={idx} hidden={!visible}>
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}
