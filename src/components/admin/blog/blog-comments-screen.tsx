"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { CardGridSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  adminInputClass,
  adminLinkClass,
  ToneBadge,
} from "@/components/admin/ui";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/use-confirm";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { BLOG_COMMENT_MAX } from "@/lib/limits";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  useDeleteBlogCommentMutation,
  useEditBlogCommentMutation,
  useFlagBlogCommentMutation,
  useGetBlogCommentsQuery,
  useReplyToBlogCommentMutation,
} from "@/redux/blog/blog-admin-api";
import type { IBlogComment } from "@/types/blog.types";

const FILTER_DEFAULTS = { status: "all" };
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "visible", label: "Showing" },
  { value: "flagged", label: "Hidden" },
] as const;

/** Inline text box for a reply or an edit. */
function TextBox({
  initial = "",
  label,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  label: string;
  submitLabel: string;
  onSubmit: (text: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        void onSubmit(text.trim()).then(() => setBusy(false));
      }}
    >
      <Textarea
        aria-label={label}
        rows={3}
        maxLength={BLOG_COMMENT_MAX}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        className={cn(adminInputClass, "h-auto min-h-[76px] py-2")}
      />
      <div className="flex gap-2">
        <AdminButton
          type="submit"
          size="sm"
          loading={busy}
          disabled={busy || !text.trim()}
        >
          {submitLabel}
        </AdminButton>
        <AdminButton
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

function CommentBody({
  comment,
  onEdit,
  onToggleHidden,
  onDelete,
  onReply,
}: {
  comment: IBlogComment;
  onEdit: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  onReply?: () => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 text-[12.5px] font-bold text-adm-ink [overflow-wrap:anywhere]">
          {comment.authorName}
        </span>
        {comment.isStaff ? <ToneBadge tone="forest">Staff</ToneBadge> : null}
        {comment.flaggedAt ? <ToneBadge tone="alert">Hidden</ToneBadge> : null}
        <span className="text-[11px] text-adm-muted">
          {formatDateTime(comment.createdAt)}
          {comment.editedAt ? " · edited" : ""} · {comment.likeCount} likes
        </span>
      </div>
      <p className="whitespace-pre-line text-[13px] leading-[1.6] text-adm-body [overflow-wrap:anywhere]">
        {comment.content}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {onReply ? (
          <AdminButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={onReply}
          >
            Reply
          </AdminButton>
        ) : null}
        <AdminButton type="button" size="sm" variant="outline" onClick={onEdit}>
          Edit
        </AdminButton>
        <AdminButton
          type="button"
          size="sm"
          variant="outline"
          onClick={onToggleHidden}
        >
          {comment.flaggedAt ? "Show" : "Hide"}
        </AdminButton>
        <AdminButton
          type="button"
          size="sm"
          variant="danger"
          onClick={onDelete}
        >
          Delete
        </AdminButton>
      </div>
    </div>
  );
}

/**
 * Reader comments across every post. Comments publish straight away, so this
 * is where staff answer readers (a reply shows as "DB PLUS" on the site),
 * hide a comment pending a look (kept, not shown), or delete it.
 */
export function BlogCommentsScreen() {
  const { page, setPage, filters, setFilter, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const status = filters.status;
  const { data, isLoading, isError, error, refetch } = useGetBlogCommentsQuery({
    page,
    limit: 20,
    ...(status !== "all" ? { status: status as "visible" | "flagged" } : {}),
  });
  const [reply] = useReplyToBlogCommentMutation();
  const [edit] = useEditBlogCommentMutation();
  const [flag] = useFlagBlogCommentMutation();
  const [remove] = useDeleteBlogCommentMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [open, setOpen] = useState<null | {
    id: string;
    mode: "edit" | "reply";
  }>(null);

  const run = async (action: Promise<unknown>, done: string) => {
    try {
      await action;
      notify.success(done);
      setOpen(null);
      return true;
    } catch (err) {
      notify.error("Couldn't update the comment", {
        description: extractApiError(err).message,
      });
      return false;
    }
  };

  const actionsFor = (c: IBlogComment, topLevel: boolean) => ({
    onEdit: () => setOpen({ id: c.id, mode: "edit" }),
    onReply: topLevel ? () => setOpen({ id: c.id, mode: "reply" }) : undefined,
    onToggleHidden: () =>
      void run(
        flag({ id: c.id, flagged: !c.flaggedAt }).unwrap(),
        c.flaggedAt ? "Comment shown again" : "Comment hidden",
      ),
    onDelete: () =>
      void (async () => {
        const ok = await confirm({
          title: "Delete this comment?",
          description: topLevel
            ? "It and its replies are removed from the website."
            : "The reply is removed from the website.",
          confirmText: "Delete",
          isDestructive: true,
        });
        if (ok) await run(remove(c.id).unwrap(), "Comment deleted");
      })(),
  });

  const editor = (c: IBlogComment) =>
    open?.id === c.id ? (
      <TextBox
        initial={open.mode === "edit" ? c.content : ""}
        label={open.mode === "edit" ? "Edit comment" : "Your reply"}
        submitLabel={open.mode === "edit" ? "Save" : "Post reply"}
        onCancel={() => setOpen(null)}
        onSubmit={(text) =>
          open.mode === "edit"
            ? run(edit({ id: c.id, content: text }).unwrap(), "Comment updated")
            : run(reply({ id: c.id, content: text }).unwrap(), "Reply posted")
        }
      />
    ) : null;

  const comments = data?.data ?? [];
  const meta = data?.meta;
  const filtered = status !== "all";

  return (
    <div>
      {confirmationDialog}
      <AdminPageHeader
        title="Blog comments"
        sub="What readers say under your articles - reply, hide or delete"
      />
      <ConsoleFilterBar
        hideSearch
        activeCount={filtered ? 1 : 0}
        onClear={resetFilters}
        totalCount={meta?.total ?? 0}
        noun="comments"
        inlineFilter={
          <ConsoleLabeledSelect
            label="Show"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_OPTIONS}
            active={filtered}
          />
        }
      />
      {isLoading ? (
        <CardGridSkeleton />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : comments.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="comments"
          description="Reader comments on published posts appear here."
          onClear={resetFilters}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id}>
              <AdminCard className="flex min-w-0 flex-col gap-3 px-5 py-4">
                {c.post ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-adm-muted">
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      On{" "}
                      <Link
                        href={`/admin/blog/${c.post.id}`}
                        className={adminLinkClass}
                      >
                        {c.post.title}
                      </Link>
                    </span>
                    <a
                      href={routes.blogPost(c.post.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        adminLinkClass,
                        "inline-flex items-center gap-1",
                      )}
                    >
                      View on site
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                ) : null}
                <CommentBody comment={c} {...actionsFor(c, true)} />
                {editor(c)}
                {c.replies?.length ? (
                  <ul className="flex flex-col gap-3 border-l-2 border-adm-line pl-4">
                    {c.replies.map((r) => (
                      <li key={r.id}>
                        <CommentBody comment={r} {...actionsFor(r, false)} />
                        {editor(r)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
      {meta && meta.totalPages > 1 ? (
        <div className="mt-4">
          <ListPagination
            page={page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
