"use client";

import { useEffect, useRef, useState } from "react";
import { Search, CheckCircle2, XCircle, Save, Rows3, Rows2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ChecklistSearchProps {
  templateId: string;
  labels: string[];
  children: React.ReactNode[];
}

const draftKey = (templateId: string) => `armoury.draft.${templateId}`;

function snapshotForm(container: HTMLElement): Record<string, string> {
  const snapshot: Record<string, string> = {};
  container
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea",
    )
    .forEach((el) => {
      if (!el.name) return;
      if (el instanceof HTMLInputElement && el.type === "radio") {
        if (el.checked) snapshot[el.name] = el.value;
      } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
        snapshot[el.name] = el.checked ? "1" : "";
      } else {
        snapshot[el.name] = el.value ?? "";
      }
    });
  return snapshot;
}

function applySnapshot(
  container: HTMLElement,
  snapshot: Record<string, string>,
): void {
  Object.entries(snapshot).forEach(([name, value]) => {
    const els = container.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(`[name="${CSS.escape(name)}"]`);
    els.forEach((el) => {
      if (el instanceof HTMLInputElement && el.type === "radio") {
        if (el.value === value && !el.checked) el.click();
      } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.checked = value === "1";
      } else if ("value" in el) {
        el.value = value;
      }
    });
  });
}

export function ChecklistSearch({
  templateId,
  labels,
  children,
}: ChecklistSearchProps) {
  const [query, setQuery] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dense, setDense] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    try {
      const raw = window.localStorage.getItem(draftKey(templateId));
      if (raw) {
        applySnapshot(container, JSON.parse(raw));
      }
    } catch {
      // ignore corrupt drafts
    }
  }, [templateId]);

  function selectAllBoolean(value: "yes" | "no") {
    const container = containerRef.current;
    if (!container) return;
    container
      .querySelectorAll<HTMLInputElement>(
        `input[type="radio"][value="${value}"]`,
      )
      .forEach((el) => {
        if (!el.checked) el.click();
      });
  }

  function saveDraft() {
    const container = containerRef.current;
    if (!container) return;
    const snapshot = snapshotForm(container);
    try {
      window.localStorage.setItem(draftKey(templateId), JSON.stringify(snapshot));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      // ignore quota errors
    }
  }

  function clearDraftOnSubmit() {
    try {
      window.localStorage.removeItem(draftKey(templateId));
    } catch {
      // ignore
    }
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveDraft}
            aria-label="Save draft"
          >
            <Save className="mr-1 h-3.5 w-3.5" />
            Save draft
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDense((d) => !d)}
            aria-label={dense ? "Roomy view" : "Condensed view"}
          >
            {dense ? (
              <Rows3 className="mr-1 h-3.5 w-3.5" />
            ) : (
              <Rows2 className="mr-1 h-3.5 w-3.5" />
            )}
            {dense ? "Roomy" : "Condensed"}
          </Button>
        </div>
      </div>
      {savedAt && (
        <p className="text-xs text-muted-foreground">
          Draft saved at {savedAt}
        </p>
      )}
      <div
        className={dense ? "space-y-2" : "space-y-6"}
        data-testid="checklist-items"
        data-density={dense ? "condensed" : "roomy"}
      >
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
      <input
        type="hidden"
        name="__draft_cleanup"
        onClick={clearDraftOnSubmit}
      />
    </div>
  );
}
