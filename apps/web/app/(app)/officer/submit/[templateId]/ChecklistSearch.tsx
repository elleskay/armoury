"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface ChecklistSearchProps {
  labels: string[];
  children: React.ReactNode[];
}

export function ChecklistSearch({ labels, children }: ChecklistSearchProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  return (
    <div className="space-y-4">
      <div className="relative">
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
