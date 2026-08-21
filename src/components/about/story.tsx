import { Photo } from "@/components/ui/Photo";
import { StencilLabel } from "@/components/ui/StencilLabel";

const STORY_PHOTO = "/images/about-story.webp";

/** Editorial opener - the ghost "TAMALE" stencil, story copy, treated photo
 * with the rotated caption plate. */
export function Story() {
  return (
    // overflow-x-clip crops the ghost word at the canvas edge without ever
    // creating a horizontal scrollbar (and without clipping vertically).
    <section className="relative overflow-x-clip px-5 pt-10 lg:px-0 lg:pt-[88px]">
      <span
        aria-hidden="true"
        className="stencil absolute -right-11 top-16 z-0 select-none whitespace-nowrap text-[108px] leading-none tracking-[0.02em] text-soil/13 lg:-right-24 lg:top-5 lg:text-[240px]"
      >
        ABOUT
      </span>
      <div className="relative mx-auto grid max-w-[1312px] items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[72px] lg:px-8">
        <div className="relative z-[2]">
          <div className="mb-4 flex items-center gap-2.5">
            <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
              ABOUT · THE TRADING HOUSE
            </StencilLabel>
          </div>
          <h1 className="mb-5 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.015em] text-forest lg:mb-[26px] lg:text-[56px] lg:leading-[1.04]">
            A trading house built one season at a time.
          </h1>
          <p className="mb-4 text-[14px] leading-[1.7] text-ink lg:text-[16.5px] lg:leading-[1.75]">
            DB Plus started the way most trading in the north starts - one
            buyer, a weighing scale and a rented corner of a warehouse in
            Tamale. Season by season the relationships grew: farmers who knew
            the scale was honest, agents who knew payment came the same day,
            and buyers in the south who knew the truck would arrive when we
            said it would.
          </p>
          <p className="mb-6 text-[14px] leading-[1.7] text-soil lg:text-[16.5px] lg:leading-[1.75]">
            Today we buy maize, soya beans and groundnuts across the Northern
            Region, aggregate them in our own warehouses, and deliver by the
            truckload to processors, feed mills and wholesalers in Accra and
            Kumasi.
          </p>
          <p className="max-w-[34ch] font-display text-[16px] font-semibold leading-[1.5] text-forest lg:text-[20px]">
            The founder still walks the warehouse floor - {" "}
            <span className="shadow-[inset_0_-9px_0_rgb(216_156_46/0.45)]">
              that&rsquo;s how the weighing stays honest.
            </span>
          </p>
        </div>
        <div className="relative z-[3] mb-8 lg:-mb-16 lg:mb-[-64px]">
          <div className="shadow-doc-dark relative h-[220px] border border-soil/30 sm:h-[340px] lg:h-[500px]">
            <Photo
              src={STORY_PHOTO}
              alt="Weighing a sack of grain on the platform scale inside the warehouse, stock stacked behind"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover saturate-[0.72]"
              fallbackLabel="TAMALE WAREHOUSE"
            />
            <div aria-hidden="true" className="photo-treatment absolute inset-0" />
          </div>
          <div className="absolute -bottom-3.5 left-0 max-w-[250px] rotate-[-1.2deg] bg-forest px-3.5 py-2.5 text-[11.5px] font-semibold leading-[1.45] text-surface shadow-[2px_2px_0_rgb(31_33_28/0.3)] lg:-left-[22px] lg:bottom-[26px] lg:max-w-[300px] lg:px-[18px] lg:py-[13px] lg:text-[13px] lg:leading-[1.5] lg:shadow-[3px_3px_0_rgb(31_33_28/0.3)]">
            Weighing at the Tamale warehouse - every bag gets a ticket.
          </div>
        </div>
      </div>
    </section>
  );
}
