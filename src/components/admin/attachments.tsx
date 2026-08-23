"use client";

import { Download, File, FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { TONES, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/**
 * The console's attachment idiom: every private document on a detail page -
 * agreements, waybills, indentures - renders as a FILE, not as a text link.
 *
 * A flat row (green link, date, a remove control) reads as one more line of
 * prose in a page full of prose, so an attachment earns a tile instead: a
 * file-type plate, the document's name, the filed-at stamp, and a download
 * glyph that says "this fetches a file" before anything is hovered. The whole
 * tile opens the document; remove stays its own small target.
 *
 * The backend stores only a display name per document, so the type plate is
 * best-effort: named with an extension ("waybill.pdf", a signature's ".png")
 * it gets the matching glyph and label, otherwise a neutral FILE plate.
 */

type AttachmentKind = {
  icon: typeof File;
  label: string;
  tone: Tone;
};

const KIND_BY_EXT: Record<string, AttachmentKind> = {
  pdf: { icon: FileText, label: "PDF", tone: "alert" },
  doc: { icon: FileText, label: "DOC", tone: "sky" },
  docx: { icon: FileText, label: "DOCX", tone: "sky" },
  png: { icon: ImageIcon, label: "PNG", tone: "leaf" },
  jpg: { icon: ImageIcon, label: "JPG", tone: "leaf" },
  jpeg: { icon: ImageIcon, label: "JPEG", tone: "leaf" },
  webp: { icon: ImageIcon, label: "WEBP", tone: "leaf" },
  heic: { icon: ImageIcon, label: "HEIC", tone: "leaf" },
};

const FALLBACK_KIND: AttachmentKind = { icon: File, label: "File", tone: "slate" };

const kindOf = (name: string): AttachmentKind => {
  const ext = /\.([a-z0-9]{2,5})$/i.exec(name.trim())?.[1]?.toLowerCase();
  return (ext && KIND_BY_EXT[ext]) || FALLBACK_KIND;
};

/**
 * The tile grid. auto-fill against a real minimum rather than a column count,
 * so one attachment doesn't stretch across a whole card and five don't stack
 * into a tower where two would fit - and the same list works in a 340px rail
 * and a full-width card without media queries.
 */
export function AttachmentList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-2",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/** One filed document, as an attachment tile. */
export function AttachmentTile({
  createdAt,
  href,
  name,
  onRemove,
  /** One line under the name; defaults to "TYPE · filed-at stamp". */
  meta,
}: {
  createdAt?: string;
  /** Authenticated download URL - the whole tile opens it in a new tab. */
  href: string;
  name: string;
  meta?: string;
  /** Renders the small remove target when the caller allows removal. */
  onRemove?: () => void;
}) {
  const kind = kindOf(name);
  const t = TONES[kind.tone];
  const Icon = kind.icon;
  const stamp = createdAt ? formatDateTime(createdAt) : "";
  const metaLine = meta ?? [kind.label, stamp].filter(Boolean).join(" · ");

  return (
    <li className="relative flex min-w-0 items-center gap-3 rounded-none border border-adm-line bg-adm-card p-2.5 transition-colors hover:border-adm-strong hover:bg-adm-sunken">
      {/* The type plate: the one loud element, so a run of tiles scans by
          kind the way an inbox's attachments do. */}
      <span
        aria-hidden="true"
        className="flex size-9 flex-none items-center justify-center rounded-none"
        style={{ background: t.bg, color: t.fg }}
      >
        <Icon className="size-4.5" />
      </span>
      {/* Stretched link: the tile is the target, the remove button floats
          above it. Safe single-line clamp - `truncate` would hand the tile
          the name's full min-content width and stretch the grid track. */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${name}`}
        className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:rounded-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-console"
      >
        <span className="block min-w-0 text-[11.5px] leading-[1.35] font-semibold text-adm-ink line-clamp-1 whitespace-normal [overflow-wrap:anywhere]">
          {name}
        </span>
        <span className="mt-0.5 block min-w-0 text-[10.5px] text-adm-muted line-clamp-1 whitespace-normal [overflow-wrap:anywhere]">
          {metaLine}
        </span>
      </a>
      <Download aria-hidden="true" className="size-3.5 flex-none text-adm-faint" />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="relative flex size-6 flex-none cursor-pointer items-center justify-center rounded-full text-adm-faint transition-colors hover:bg-console-red/10 hover:text-console-red"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

/** The section with nothing filed yet: a dashed slot, so "no documents"
 * reads as an empty drawer rather than a missing feature. */
export function AttachmentEmpty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-none border border-dashed border-adm-strong/60 px-4 py-5">
      <Paperclip aria-hidden="true" className="size-3.5 flex-none text-adm-faint" />
      <p className="text-[11px] text-adm-muted">{text}</p>
    </div>
  );
}
