import Link from "next/link";

export default function AgentNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-[18px] font-bold">This page does not exist</h1>
      <p className="max-w-[360px] text-[13.5px] leading-[1.6] opacity-80">
        The address may be mistyped. Nothing was changed by opening it.
      </p>
      <Link
        href="/agent"
        className="mt-2 border px-4 py-2 text-[13.5px] font-semibold"
      >
        Back to your console
      </Link>
    </div>
  );
}
