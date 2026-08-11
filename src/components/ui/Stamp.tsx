import { cn } from "@/lib/utils";

/**
 * A rubber stamp - the rotated, double-bordered stencil mark the design uses
 * to close documents ("ON RECORD", "EVERY LOAD", "RECEIVED").
 */
export function Stamp({
  children,
  tone = "leaf",
  className,
}: {
  children: React.ReactNode;
  /** leaf = approvals; error = failed states. */
  tone?: "error" | "leaf";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stencil inline-block rotate-[-5deg] rounded-none border-[3px] bg-surface px-4 py-2.5 text-[15px] tracking-[0.16em]",
        tone === "leaf"
          ? "border-leaf text-leaf [text-shadow:0_0_1px_rgb(62_125_98/0.6)]"
          : "border-error text-error [text-shadow:0_0_1px_rgb(155_58_34/0.5)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
