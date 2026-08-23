"use client";

import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpWrap } from "@/components/admin/help-tip";
import { cn } from "@/lib/utils";

/**
 * A row's actions, behind one icon.
 *
 * Listed out, three or four of them take a couple of hundred pixels of every
 * row - width taken from the column carrying the name a person is actually
 * scanning for, on every row, whether or not anybody ever uses them. Behind a
 * menu they cost 28px and read as a single affordance.
 *
 * The menu names the record it belongs to. A menu that opens over a table of
 * forty rows and says only "Remove" is a menu you have to trust yourself to
 * have tapped the right row for.
 *
 * The `contents` wrapper is layout-neutral but load-bearing: Radix portals the
 * menu to <body>, yet React's synthetic events still bubble through the
 * component tree, so without it a click inside the menu reaches the row
 * underneath and navigates away from the thing being acted on.
 */
export function RowActions({
  children,
  label,
}: {
  children: ReactNode;
  /** The record this menu belongs to, named in the menu and its trigger. */
  label: string;
}) {
  return (
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${label}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-none text-adm-faint outline-none hover:bg-adm-sunken hover:text-adm-muted focus-visible:ring-2 focus-visible:ring-console/40"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel
            title={label}
            className="max-w-full truncate text-[10.5px] font-semibold tracking-[0.08em] text-adm-faint uppercase"
          >
            {label}
          </DropdownMenuLabel>
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/**
 * One line of a row menu: an icon, a label, and what it does.
 *
 * `unavailable` is for an action a record cannot take - it stays on the menu,
 * greyed, with the reason on hover. Removing the line instead leaves somebody
 * hunting for an action that is simply absent on this row and present on the
 * next.
 */
export function RowAction({
  danger,
  icon: Icon,
  label,
  onSelect,
  unavailable,
}: {
  /** A destructive action, coloured as one. */
  danger?: boolean;
  icon: React.ComponentType<{ "aria-hidden"?: boolean | "true"; className?: string }>;
  label: string;
  onSelect: () => void;
  /** Why this row cannot take the action. Present means disabled. */
  unavailable?: string;
}) {
  const item = (
    <DropdownMenuItem
      disabled={Boolean(unavailable)}
      className={cn(
        "cursor-pointer gap-2 text-[11px]",
        danger && "text-console-red focus:text-console-red",
      )}
      onClick={() => {
        if (!unavailable) onSelect();
      }}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </DropdownMenuItem>
  );
  return unavailable ? (
    <HelpWrap text={unavailable}>
      <span className="block">{item}</span>
    </HelpWrap>
  ) : (
    item
  );
}

export { DropdownMenuSeparator as RowActionSeparator };
