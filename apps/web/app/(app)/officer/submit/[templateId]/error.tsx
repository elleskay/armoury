"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SubmitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error("Submit failed. Your changes are not lost.", {
      description: "Network error or server problem. Try again.",
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Submission failed</h2>
            <p className="text-sm text-muted-foreground">
              We could not record this checklist. Your draft (if saved) is still
              available in your browser.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">
                Reference: {error.digest}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => reset()}>
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
