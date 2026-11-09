"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import {
  useDeleteBlogTaxonomyMutation,
  useGetBlogTaxonomyQuery,
  useSaveBlogTaxonomyMutation,
} from "@/redux/blog/blog-admin-api";
import type { IBlogTaxonomyWithCount } from "@/types/blog.types";

type Kind = "categories" | "tags";
const NAME_MAX = 60;

function NameForm({
  initial = "",
  label,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  label: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex min-w-0 flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setBusy(true);
        void onSubmit(trimmed).then((ok) => {
          setBusy(false);
          if (ok && !initial) setName("");
        });
      }}
    >
      <Input
        aria-label={label}
        value={name}
        maxLength={NAME_MAX}
        onChange={(e) => setName(e.target.value)}
        placeholder={label}
        className={`${adminInputClass} min-w-0 flex-1`}
      />
      <div className="flex gap-2">
        <AdminButton
          type="submit"
          loading={busy}
          disabled={busy || !name.trim()}
        >
          {submitLabel}
        </AdminButton>
        {onCancel ? (
          <AdminButton type="button" variant="outline" onClick={onCancel}>
            Cancel
          </AdminButton>
        ) : null}
      </div>
    </form>
  );
}

function TaxonomyCard({
  kind,
  title,
  noun,
}: {
  kind: Kind;
  title: string;
  noun: string;
}) {
  const { data, isLoading, isError, error, refetch } =
    useGetBlogTaxonomyQuery(kind);
  const [save] = useSaveBlogTaxonomyMutation();
  const [remove] = useDeleteBlogTaxonomyMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [editing, setEditing] = useState<null | string>(null);

  const submit = async (name: string, id?: string) => {
    try {
      await save({ kind, id, name }).unwrap();
      notify.success(id ? `${noun} renamed` : `${noun} added`);
      setEditing(null);
      return true;
    } catch (err) {
      notify.error(`Couldn't save the ${noun.toLowerCase()}`, {
        description: extractApiError(err).message,
      });
      return false;
    }
  };

  const onDelete = async (row: IBlogTaxonomyWithCount) => {
    const ok = await confirm({
      title: `Delete "${row.name}"?`,
      description:
        kind === "categories"
          ? `${String(row.postCount)} post(s) use it; they stay published, just without a category.`
          : `It is removed from ${String(row.postCount)} post(s).`,
      confirmText: "Delete",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await remove({ kind, id: row.id }).unwrap();
      notify.success(`${noun} deleted`);
    } catch (err) {
      notify.error(`Couldn't delete the ${noun.toLowerCase()}`, {
        description: extractApiError(err).message,
      });
    }
  };

  const rows = data ?? [];
  return (
    <AdminCard className="flex min-w-0 flex-col gap-4 px-5 py-4">
      {confirmationDialog}
      <h2 className="text-[14px] font-bold text-adm-ink">{title}</h2>
      <NameForm
        label={`New ${noun.toLowerCase()} name`}
        submitLabel="Add"
        onSubmit={(name) => submit(name)}
      />
      {isLoading ? (
        <p className="text-[12px] text-adm-muted">Loading…</p>
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <p className="text-[12px] text-adm-muted">
          No {title.toLowerCase()} yet.
        </p>
      ) : (
        <ul className="divide-y divide-adm-hairline border-t border-adm-hairline">
          {rows.map((row) => (
            <li key={row.id} className="py-2.5">
              {editing === row.id ? (
                <NameForm
                  initial={row.name}
                  label={`Rename ${row.name}`}
                  submitLabel="Save"
                  onSubmit={(name) => submit(name, row.id)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere] text-[13px] font-semibold text-adm-ink">
                    {row.name}
                    <span className="ml-2 text-[11px] font-normal text-adm-muted">
                      {row.postCount} {row.postCount === 1 ? "post" : "posts"}
                    </span>
                  </span>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Rename ${row.name}`}
                    onClick={() => setEditing(row.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${row.name}`}
                    onClick={() => void onDelete(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </AdminButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

/** The blog's two vocabularies, side by side from md. */
export function BlogTopicsScreen() {
  return (
    <div>
      <AdminPageHeader
        title="Categories & tags"
        sub="How blog readers browse: one category per post, and any number of tags"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TaxonomyCard kind="categories" title="Categories" noun="Category" />
        <TaxonomyCard kind="tags" title="Tags" noun="Tag" />
      </div>
    </div>
  );
}
