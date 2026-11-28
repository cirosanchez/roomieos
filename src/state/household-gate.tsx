"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { House } from "lucide-react";
import { useHousehold } from "./household-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Wordmark } from "@/components/wordmark";

export function HouseholdGate({
  children,
  welcome = false,
}: {
  children: ReactNode;
  welcome?: boolean;
}) {
  const { status, conflict, error, store } = useHousehold();
  const router = useRouter();
  const pathname = usePathname();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetError, setResetError] = useState<string>();
  const needsSetup = status === "empty" && !welcome;
  const hasHousehold = status === "ready" && welcome;
  useEffect(() => {
    if (needsSetup) router.replace("/welcome");
    if (hasHousehold) router.replace("/dashboard");
  }, [needsSetup, hasHousehold, router, pathname]);

  if (status === "loading" || needsSetup || hasHousehold)
    return (
      <main
        className="flex min-h-dvh items-center justify-center gap-3 px-5 text-sm text-muted"
        aria-busy="true"
      >
        <House aria-hidden="true" className="size-5" />
        <p>Opening your household…</p>
      </main>
    );
  if (status === "invalid" || status === "unavailable") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
        <div className="mb-10">
          <Wordmark />
        </div>
        <h1 className="text-2xl font-bold">
          {status === "invalid"
            ? "Saved data couldn't be opened"
            : "Browser storage is unavailable"}
        </h1>
        <div className="mt-5">
          <InlineNotice tone="error">{error}</InlineNotice>
        </div>
        {conflict && (
          <p className="mt-4 text-sm text-warning">
            Saved data changed in another tab. Retry before resetting.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => store.initialize()}>
            Retry opening saved data
          </Button>
          {status === "invalid" && (
            <Button
              variant="danger"
              onClick={() => {
                setResetError(undefined);
                setConfirmReset(true);
              }}
            >
              Reset saved data
            </Button>
          )}
        </div>
        <ConfirmDialog
          open={confirmReset}
          onClose={() => setConfirmReset(false)}
          title="Reset saved data?"
          description="This permanently removes this browser's RoomieOS household, including chores, expenses and agreements. You will return to the sample or empty household choice."
          confirmLabel="Erase saved household"
          destructive
          error={resetError}
          onConfirm={() => {
            const result = store.clear();
            if (result.ok) setConfirmReset(false);
            else setResetError(result.error);
          }}
        />
      </main>
    );
  }
  return (
    <>
      {conflict && (
        <div
          className="border-b border-warning bg-warning-bg px-4 py-3 text-sm text-warning"
          role="alert"
        >
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3">
            <p>
              This household changed in another tab. Reload before saving;
              unsaved form entries will be lost when you reload.
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reload saved household
            </Button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
