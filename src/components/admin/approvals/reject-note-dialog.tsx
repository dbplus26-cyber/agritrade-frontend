"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminButton, AdminField, adminInputClass } from "@/components/admin/ui";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import {
  rejectNoteSchema,
  type RejectNoteValues,
} from "@/validations/approval-schema";

/**
 * The one modal the queue has to build for itself.
 *
 * `ConfirmationDialog` covers "are you sure" and even type-to-confirm, but a
 * rejection needs a required free-text reason, which no confirm primitive can
 * carry. Everything else - approving, bulk approving - goes through
 * `useConfirm` rather than another bespoke dialog.
 */
export function RejectNoteDialog({
  open,
  onOpenChange,
  onSubmit,
  subject,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note: string) => void;
  /** What is being turned back, restated so nobody rejects the wrong row. */
  subject: string;
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectNoteValues>({
    resolver: zodResolver(rejectNoteSchema),
    values: { note: "" },
  });

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = handleSubmit((values) => {
    onSubmit(values.note.trim());
    reset();
  });

  return (
    <ResponsiveDialog open={open} onOpenChange={close}>
      <ResponsiveDialogContent className="sm:max-w-[440px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Reject this request?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Rejecting undoes nothing by itself - a flagged purchase stays
            recorded until someone voids it. Your note is what the requester
            sees.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="rounded-[6px] border border-[var(--ap-hair)] bg-[var(--ap-surface-alt)] px-3 py-2 text-[13px] text-[var(--ap-ink)] [overflow-wrap:anywhere]">
          {subject}
        </div>

        <form onSubmit={(e) => void submit(e)} className="grid gap-3.5">
          <AdminField label="Why (required)" error={errors.note?.message}>
            <textarea
              rows={4}
              autoFocus
              placeholder="Say what should happen instead"
              className={cn(adminInputClass, "h-auto py-2 leading-[1.5]")}
              {...register("note")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton variant="outline" size="lg" onClick={() => close(false)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="danger" size="lg" disabled={submitting}>
              {submitting ? "Working…" : "Reject request"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
