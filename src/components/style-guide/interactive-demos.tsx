"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useConfirm } from "@/hooks/use-confirm";
import { notify } from "@/lib/notify";

/**
 * The style guide's interactive corner: fire the toasts, open the confirm
 * gate, and peek at the general loader - the states a static sheet can't show.
 */
export function InteractiveDemos() {
  const { confirm, confirmationDialog } = useConfirm();
  const [showLoader, setShowLoader] = useState(false);

  const onDestructive = async () => {
    const confirmed = await confirm({
      title: "Strike this plot off the register?",
      description:
        "Plot 14, Kumbungu Road will be removed from the public list. This can't be undone from here.",
      confirmText: "Strike it off",
      isDestructive: true,
      requireExactMatch: "PLOT-14",
    });
    if (confirmed) notify.success("Struck off the register");
  };

  return (
    <div className="flex flex-col gap-5">
      {confirmationDialog}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => notify.success("Enquiry on file", { description: "We reply within one working day." })}
        >
          Success toast
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            notify.error("Couldn't send your enquiry", {
              description: "Couldn't reach the server. Check your connection and try again.",
            })
          }
        >
          Error toast
        </Button>
        <Button
          variant="outline"
          onClick={() => notify.info("Groundnuts are back on the board")}
        >
          Info toast
        </Button>
        <Button variant="outline" onClick={() => void onDestructive()}>
          Confirmation dialog
        </Button>
        <Button variant="outline" onClick={() => setShowLoader((s) => !s)}>
          {showLoader ? "Hide" : "Show"} general loader
        </Button>
      </div>
      {showLoader ? (
        <div className="border border-dashed border-soil/40">
          <LoadingScreen />
        </div>
      ) : null}
    </div>
  );
}
