import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/Stamp";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="texture-grain flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="shadow-doc relative w-[min(460px,100%)] border border-soil/35 bg-paper px-8 pb-10 pt-7">
        <div className="flex items-baseline justify-between border-b-[1.5px] border-soil/50 pb-3">
          <StencilLabel className="tracking-[0.22em] text-ink">
            Records office
          </StencilLabel>
          <StencilLabel className="tracking-[0.14em]">N° 404</StencilLabel>
        </div>
        <div
          aria-hidden="true"
          className="relative my-7 h-[110px] bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_25px,rgb(89_82_59/0.25)_25px,rgb(89_82_59/0.25)_26px)]"
        >
          <Stamp className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
            Not on file
          </Stamp>
        </div>
        <h1 className="mb-2 font-display text-[24px] font-bold text-forest">
          We checked the ledger twice.
        </h1>
        <p className="mx-auto mb-7 max-w-[38ch] text-[14px] leading-[1.65] text-soil">
          There&rsquo;s no page filed at this address. It may have been moved,
          or the link was copied wrong.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <Button asChild>
            <Link href={routes.home}>Back to the front office</Link>
          </Button>
          <BackButton href={routes.home} label="Go back" />
        </div>
      </div>
    </div>
  );
}
