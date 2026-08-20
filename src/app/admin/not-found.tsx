import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[13px] tracking-wide text-adm-faint uppercase">
        Not on file
      </p>
      <h1 className="text-[20px] font-bold text-adm-ink">
        This console page does not exist
      </h1>
      <p className="max-w-[420px] text-[13.5px] leading-[1.6] text-adm-muted">
        The address may be mistyped, or the record it pointed at may have been
        removed. Nothing was changed by opening it.
      </p>
      <Link
        href="/admin"
        className="mt-2 border border-adm-line bg-adm-card px-4 py-2 text-[13.5px] font-semibold text-adm-ink transition-colors hover:bg-adm-sunken"
      >
        Back to the console
      </Link>
    </div>
  );
}
