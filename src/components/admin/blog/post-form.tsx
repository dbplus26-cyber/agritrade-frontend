"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink } from "lucide-react";
import { RichTextEditor } from "@/components/admin/blog/rich-text-editor";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  adminLinkClass,
  adminSelectClass,
  CommitRow,
  DetailHeader,
  ToneBadge,
} from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/use-confirm";
import { usePhotoStaging } from "@/hooks/use-photo-staging";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { extractApiError } from "@/lib/extract-api-error";
import { BLOG_EXCERPT_MAX, BLOG_TAGS_MAX, BLOG_TITLE_MAX } from "@/lib/limits";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  useCreateBlogPostMutation,
  useDeleteBlogPostMutation,
  useGetBlogTaxonomyQuery,
  useUpdateBlogPostMutation,
} from "@/redux/blog/blog-admin-api";
import type { IBlogPost, IBlogPostInput } from "@/types/blog.types";
import { postSchema, type PostValues } from "@/validations/blog-schema";

const LIST = "/admin/blog";

const toFormValues = (post?: IBlogPost): PostValues => ({
  categoryId: post?.category?.id ?? "",
  content: post?.content ?? "",
  excerpt: post?.excerpt ?? "",
  isFeatured: post?.isFeatured ?? false,
  tagIds: post?.tags.map((t) => t.id) ?? [],
  title: post?.title ?? "",
});

/**
 * Write or edit a post. A new post is saved as a draft or published in one
 * step. On an existing post "Save changes" never touches whether it is live;
 * Publish/Unpublish is its own action (and saves pending edits with it).
 */
export function PostForm({ post }: { post?: IBlogPost }) {
  const { confirm, confirmationDialog } = useConfirm();
  const [createPost, createState] = useCreateBlogPostMutation();
  const [updatePost, updateState] = useUpdateBlogPostMutation();
  const [deletePost, deleteState] = useDeleteBlogPostMutation();
  const categories = useGetBlogTaxonomyQuery("categories").data ?? [];
  const tags = useGetBlogTaxonomyQuery("tags").data ?? [];
  const saving = createState.isLoading || updateState.isLoading;
  const {
    fileInputRef,
    photoFile,
    removePhoto,
    previewUrl,
    onPickFile,
    onRemove,
    reset: resetCover,
  } = usePhotoStaging(post?.coverImage);

  const {
    control,
    register,
    handleSubmit,
    reset,
    resetField,
    formState: { errors, isDirty },
  } = useForm<PostValues>({
    resolver: zodResolver(postSchema),
    defaultValues: toFormValues(post),
  });
  // An article is an hour's writing: no way out of this page drops it quietly.
  const { leave, unsavedDialog } = useUnsavedChanges(
    isDirty || Boolean(photoFile) || removePhoto,
  );

  // True only while a saved post's values are being put back into the form.
  const adopting = useRef(false);

  const save = (publish?: boolean) =>
    handleSubmit(async (values) => {
      const body: IBlogPostInput = {
        categoryId: values.categoryId || null,
        content: values.content,
        excerpt: values.excerpt,
        isFeatured: values.isFeatured,
        tagIds: values.tagIds,
        title: values.title,
        ...(publish !== undefined ? { isPublished: publish } : {}),
        ...(post && removePhoto && !photoFile ? { removeCover: true } : {}),
      };
      try {
        const res = post
          ? await updatePost({
              id: post.id,
              body,
              cover: photoFile ?? undefined,
            }).unwrap()
          : await createPost({ body, cover: photoFile ?? undefined }).unwrap();
        notify.success(res.message);
        resetCover();
        // The body comes back sanitized and the editor re-serialises it. Done
        // synchronously so that echo is recognised as the save, not an edit.
        adopting.current = true;
        flushSync(() => reset(toFormValues(res.data.post)));
        adopting.current = false;
        if (!post) void leave(`${LIST}/${res.data.post.id}`, { ask: false });
      } catch (err) {
        notify.error("Couldn't save the post", {
          description: extractApiError(err).message,
        });
      }
    });

  /** Publishing saves the form too, so pending edits go live with it. */
  const setPublished = async (publish: boolean) => {
    if (
      !publish &&
      !(await confirm({
        title: "Take this post off the website?",
        description:
          "It goes back to being a draft. Its link stops working until you publish it again.",
        confirmText: "Unpublish",
      }))
    ) {
      return;
    }
    await save(publish)();
  };

  const onDelete = async () => {
    if (!post) return;
    if (
      !(await confirm({
        title: "Delete this post?",
        description:
          "It is removed from the website and the console, with its comments.",
        confirmText: "Delete post",
        isDestructive: true,
      }))
    ) {
      return;
    }
    try {
      await deletePost(post.id).unwrap();
      notify.success("Post deleted");
      void leave(LIST, { ask: false });
    } catch (err) {
      notify.error("Couldn't delete the post", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[900px]">
      {confirmationDialog}
      {unsavedDialog}
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Blog posts", href: LIST }]}
        current={post ? post.title : "New post"}
      >
        <DetailHeader
          title={post ? "Edit post" : "New post"}
          sub={
            post ? (
              <>
                <span>
                  {post.readMinutes} min read · {post.likeCount} likes ·{" "}
                  {post.commentCount} comments
                </span>
                {post.isPublished ? (
                  <a
                    href={routes.blogPost(post.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      adminLinkClass,
                      "inline-flex items-center gap-1",
                    )}
                  >
                    View on the website
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
              </>
            ) : (
              "Save it as a draft to come back to, or publish it straight away"
            )
          }
          badges={
            post ? (
              <>
                <ToneBadge tone={post.isPublished ? "leaf" : "slate"}>
                  {post.isPublished ? "Published" : "Draft"}
                </ToneBadge>
                {post.isFeatured ? (
                  <ToneBadge tone="harvest">Featured</ToneBadge>
                ) : null}
              </>
            ) : undefined
          }
          actions={
            post ? (
              <>
                <AdminButton
                  type="button"
                  variant={post.isPublished ? "outline" : "primary"}
                  disabled={saving}
                  onClick={() => void setPublished(!post.isPublished)}
                >
                  {post.isPublished ? "Unpublish" : "Publish"}
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="danger"
                  loading={deleteState.isLoading}
                  onClick={() => void onDelete()}
                >
                  Delete
                </AdminButton>
              </>
            ) : undefined
          }
        />
      </DetailNav>

      <form
        noValidate
        onSubmit={(e) => void save()(e)}
        className="@container flex flex-col gap-5"
      >
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <AdminField label="Title" error={errors.title?.message}>
            <Input
              maxLength={BLOG_TITLE_MAX}
              placeholder="e.g. Maize prices in Tamale this week"
              className={cn(
                adminInputClass,
                errors.title && "border-console-red",
              )}
              {...register("title")}
            />
          </AdminField>
          <AdminField
            label="Summary"
            hint="Shown on the blog list, in search results and when the link is shared."
            error={errors.excerpt?.message}
          >
            <Textarea
              rows={3}
              maxLength={BLOG_EXCERPT_MAX}
              className={cn(
                adminInputClass,
                "h-auto min-h-[84px] py-2",
                errors.excerpt && "border-console-red",
              )}
              {...register("excerpt")}
            />
          </AdminField>
          <AdminField label="Article" error={errors.content?.message}>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value}
                  // The editor's own rewording of what it was given becomes
                  // the baseline; only the writer's changes make the form
                  // unsaved.
                  onChange={(html, edited) => {
                    if (edited && !adopting.current) field.onChange(html);
                    else resetField("content", { defaultValue: html });
                  }}
                  invalid={Boolean(errors.content)}
                />
              )}
            />
          </AdminField>
        </AdminCard>

        <AdminCard className="grid grid-cols-1 gap-5 px-5 py-4 @min-[560px]:grid-cols-2">
          <AdminField
            label="Cover photo"
            optional
            className="@min-[560px]:col-span-2"
          >
            <div className="flex flex-wrap items-center gap-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview / Cloudinary
                <img
                  src={previewUrl}
                  alt="Cover preview"
                  className="h-20 w-36 flex-none border border-adm-line object-cover"
                />
              ) : (
                <span className="flex h-20 w-36 flex-none items-center justify-center border border-dashed border-adm-line text-[10px] text-adm-faint">
                  No cover
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? "Replace cover" : "Choose cover"}
                </AdminButton>
                {previewUrl ? (
                  <AdminButton
                    type="button"
                    variant="outline"
                    onClick={onRemove}
                  >
                    Remove
                  </AdminButton>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onPickFile(file);
                }}
              />
            </div>
          </AdminField>

          <AdminField
            label="Category"
            optional
            hint="Readers can filter the blog by category."
          >
            <select className={adminSelectClass} {...register("categoryId")}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </AdminField>

          <div className="flex flex-col justify-end">
            <label className="flex min-h-[38px] items-center gap-2 text-[12px] text-adm-ink">
              <input
                type="checkbox"
                className="h-4 w-4"
                {...register("isFeatured")}
              />
              Feature this post at the top of the blog
            </label>
          </div>

          <AdminField
            label="Tags"
            optional
            className="@min-[560px]:col-span-2"
            error={errors.tagIds?.message}
          >
            <Controller
              control={control}
              name="tagIds"
              render={({ field }) =>
                tags.length === 0 ? (
                  <p className="text-[12px] text-adm-muted">
                    No tags yet.{" "}
                    <Link href="/admin/blog-topics" className={adminLinkClass}>
                      Add tags
                    </Link>
                  </p>
                ) : (
                  <div role="group" className="flex flex-wrap gap-2">
                    {tags.map((t) => {
                      const on = field.value.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          aria-pressed={on}
                          disabled={!on && field.value.length >= BLOG_TAGS_MAX}
                          onClick={() =>
                            field.onChange(
                              on
                                ? field.value.filter((id) => id !== t.id)
                                : [...field.value, t.id],
                            )
                          }
                          className={cn(
                            "min-h-[32px] max-w-full rounded-none border px-2.5 text-[12px] font-semibold [overflow-wrap:anywhere] disabled:opacity-40",
                            on
                              ? "border-console bg-console text-white"
                              : "border-adm-line bg-adm-card text-adm-body hover:border-adm-strong",
                          )}
                        >
                          #{t.name}
                        </button>
                      );
                    })}
                  </div>
                )
              }
            />
          </AdminField>
          <p className="text-[11.5px] text-adm-muted @min-[560px]:col-span-2">
            Categories and tags are kept on the{" "}
            <Link href="/admin/blog-topics" className={adminLinkClass}>
              Categories &amp; tags
            </Link>{" "}
            page.
          </p>
        </AdminCard>

        <CommitRow>
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() => void leave(LIST)}
          >
            Cancel
          </AdminButton>
          {post ? (
            <AdminButton
              type="submit"
              size="lg"
              disabled={saving}
              loading={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </AdminButton>
          ) : (
            <>
              <AdminButton
                type="button"
                variant="secondary"
                size="lg"
                disabled={saving}
                onClick={(e) => void save(false)(e)}
              >
                Save draft
              </AdminButton>
              <AdminButton
                type="button"
                size="lg"
                disabled={saving}
                loading={saving}
                onClick={(e) => void save(true)(e)}
              >
                {saving ? "Saving…" : "Publish"}
              </AdminButton>
            </>
          )}
        </CommitRow>
      </form>
    </div>
  );
}
