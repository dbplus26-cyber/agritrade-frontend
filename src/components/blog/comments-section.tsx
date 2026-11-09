"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/FieldError";
import {
  TURNSTILE_ENABLED,
  TurnstileWidget,
} from "@/components/ui/TurnstileWidget";
import { extractApiError } from "@/lib/extract-api-error";
import { BLOG_COMMENT_MAX, BLOG_COMMENT_NAME_MAX } from "@/lib/limits";
import { notify } from "@/lib/notify";
import { formatPostDate } from "@/lib/public-blog";
import { cn } from "@/lib/utils";
import {
  useCreatePostCommentMutation,
  useGetPostCommentsQuery,
  useToggleCommentLikeMutation,
} from "@/redux/blog/blog-public-api";
import type { IBlogComment } from "@/types/blog.types";
import { commentSchema, type CommentValues } from "@/validations/blog-schema";

const inputClass =
  "w-full rounded-[2px] border-[1.5px] border-soil/35 bg-[#FBFCF7] px-3.5 py-3 text-[16px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-soil/55 focus:border-leaf focus:shadow-[0_0_0_3px_rgb(62_125_98/0.16)] aria-invalid:border-error";
const labelClass = "stencil text-[11px] tracking-[0.14em] text-harvest-deep";

function CommentLike({
  comment,
  slug,
}: {
  comment: IBlogComment;
  slug: string;
}) {
  // The server's answer after a click; the list's value before one.
  const [state, setState] = useState<null | {
    liked: boolean;
    likeCount: number;
  }>(null);
  const [toggle, { isLoading }] = useToggleCommentLikeMutation();
  const liked = state?.liked ?? comment.liked;
  const count = state?.likeCount ?? comment.likeCount;
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={`${liked ? "Unlike" : "Like"} comment by ${comment.authorName}`}
      disabled={isLoading}
      onClick={() => {
        toggle({ commentId: comment.id, slug })
          .unwrap()
          .then((res) => setState(res.data))
          .catch(() => notify.error("Couldn't save that like - try again."));
      }}
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-[2px] px-2 text-[12.5px] font-semibold transition-colors hover:bg-forest/5 disabled:opacity-60",
        liked ? "text-error" : "text-soil",
      )}
    >
      <Heart
        className={cn("h-3.5 w-3.5", liked && "fill-current")}
        aria-hidden="true"
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

function CommentItem({
  comment,
  slug,
  reply = false,
}: {
  comment: IBlogComment;
  slug: string;
  reply?: boolean;
}) {
  return (
    <li
      className={cn(
        "min-w-0",
        reply
          ? "border-l-[3px] border-harvest/70 bg-surface-alt/60 py-3 pl-4 pr-3"
          : "border-b border-dotted border-soil/40 py-5",
      )}
    >
      <div className="mb-1.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="min-w-0 font-bold text-forest [overflow-wrap:anywhere]">
          {comment.authorName}
        </span>
        {comment.isStaff ? (
          <span className="stencil rounded-[2px] bg-forest px-1.5 py-0.5 text-[10px] tracking-[0.12em] text-paper">
            DB PLUS
          </span>
        ) : null}
        <time dateTime={comment.createdAt} className="text-[12px] text-soil">
          {formatPostDate(comment.createdAt)}
        </time>
        {comment.editedAt ? (
          <span className="text-[12px] italic text-soil">(edited)</span>
        ) : null}
      </div>
      <p className="whitespace-pre-line text-[14.5px] leading-[1.65] text-ink [overflow-wrap:anywhere]">
        {comment.content}
      </p>
      <div className="-ml-2 mt-1">
        <CommentLike comment={comment} slug={slug} />
      </div>
      {comment.replies?.length ? (
        <ul className="mt-2 flex flex-col gap-2">
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} slug={slug} reply />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CommentForm({ slug }: { slug: string }) {
  const fieldId = useId();
  const [create, { isLoading }] = useCreatePostCommentMutation();
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { authorName: "", content: "", website: "" },
  });

  const onSubmit = async (values: CommentValues) => {
    if (TURNSTILE_ENABLED && !turnstileToken) {
      setTurnstileError(true);
      return;
    }
    try {
      await create({
        slug,
        content: values.content,
        ...(values.authorName ? { authorName: values.authorName } : {}),
        website: values.website ?? "",
        turnstileToken: turnstileToken || undefined,
      }).unwrap();
      reset({ authorName: values.authorName, content: "", website: "" });
      notify.success("Comment posted");
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      if (fieldErrors?.content)
        setError("content", { message: fieldErrors.content });
      else notify.error("Couldn't post your comment", { description: message });
    } finally {
      // Tokens are single-use.
      setTurnstileToken("");
      setTurnstileReset((n) => n + 1);
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="relative flex flex-col gap-4 border border-soil/35 bg-paper px-5 py-5 sm:px-6"
    >
      <div className="flex flex-col gap-[7px]">
        <label htmlFor={`${fieldId}-content`} className={labelClass}>
          YOUR COMMENT *
        </label>
        <textarea
          id={`${fieldId}-content`}
          rows={4}
          maxLength={BLOG_COMMENT_MAX}
          {...register("content")}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={
            errors.content ? `${fieldId}-content-error` : undefined
          }
          className={cn(inputClass, "resize-y leading-[1.6]")}
        />
        <FieldError
          id={`${fieldId}-content-error`}
          message={errors.content?.message}
        />
      </div>
      <div className="flex flex-col gap-[7px]">
        <label htmlFor={`${fieldId}-name`} className={labelClass}>
          YOUR NAME (OPTIONAL)
        </label>
        <input
          id={`${fieldId}-name`}
          maxLength={BLOG_COMMENT_NAME_MAX}
          autoComplete="name"
          placeholder="Leave blank to post under a generated name"
          {...register("authorName")}
          aria-invalid={errors.authorName ? true : undefined}
          className={inputClass}
        />
        <FieldError
          id={`${fieldId}-name-error`}
          message={errors.authorName?.message}
        />
      </div>
      {/* Honeypot: invisible to people; the backend refuses it filled. */}
      <input
        {...register("website")}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="flex flex-col gap-[7px]">
        <TurnstileWidget
          onVerify={(token) => {
            setTurnstileToken(token);
            if (token) setTurnstileError(false);
          }}
          resetSignal={turnstileReset}
        />
        <FieldError
          id={`${fieldId}-turnstile-error`}
          message={
            turnstileError ? "Please complete the verification." : undefined
          }
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="shadow-block h-auto rounded-[2px] bg-harvest px-6 py-3 text-[15px] font-bold text-ink transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:bg-harvest hover:shadow-[2px_2px_0_#1F211C]"
        >
          {isLoading ? "Posting…" : "Post comment"}
        </Button>
        <span className="text-[12.5px] text-soil">
          Be kind. Comments appear straight away; we remove abuse.
        </span>
      </div>
    </form>
  );
}

/** The reader thread: form, then comments newest first (or oldest), paged. */
export function CommentsSection({
  slug,
  initialCount,
}: {
  slug: string;
  initialCount: number;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const { data, isLoading, isError, isFetching, refetch } =
    useGetPostCommentsQuery({ slug, page, sort });
  const comments = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? initialCount;

  return (
    <section aria-labelledby="comments-heading" className="min-w-0">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2
          id="comments-heading"
          className="font-display text-[24px] font-bold text-forest lg:text-[28px]"
        >
          Comments <span className="text-soil">({total})</span>
        </h2>
        {total > 1 ? (
          <label className="flex items-center gap-2 text-[13px] text-soil">
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as "newest" | "oldest");
                setPage(1);
              }}
              className="min-h-[40px] rounded-[2px] border-[1.5px] border-soil/35 bg-paper px-2 text-[16px] text-ink sm:text-[13px]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        ) : null}
      </div>

      <CommentForm slug={slug} />

      {isLoading ? (
        <p className="mt-6 text-[14px] text-soil">Loading comments…</p>
      ) : isError ? (
        <p className="mt-6 text-[14px] text-soil">
          Comments could not be loaded.{" "}
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-bold text-forest underline underline-offset-4"
          >
            Try again
          </button>
        </p>
      ) : comments.length === 0 ? (
        <p className="mt-6 text-[14px] text-soil">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ul className={cn("mt-4", isFetching && "opacity-70")}>
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} slug={slug} />
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 ? (
        <nav
          aria-label="Comment pages"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="stencil min-h-[44px] rounded-[2px] border-[1.5px] border-forest/45 px-4 text-[12px] tracking-[0.16em] text-forest disabled:opacity-35"
          >
            PREV
          </button>
          <span className="stencil text-[11px] tracking-[0.16em] text-soil">
            PAGE {page} OF {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="stencil min-h-[44px] rounded-[2px] border-[1.5px] border-forest/45 px-4 text-[12px] tracking-[0.16em] text-forest disabled:opacity-35"
          >
            NEXT
          </button>
        </nav>
      ) : null}
    </section>
  );
}
