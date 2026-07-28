import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[2px] border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color] duration-100 outline-none select-none focus-visible:border-leaf focus-visible:ring-3 focus-visible:ring-leaf/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-3 aria-invalid:ring-error/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[3px_3px_0_rgb(31_33_28/0.3)] hover:translate-x-px hover:translate-y-px hover:bg-primary hover:shadow-[2px_2px_0_rgb(31_33_28/0.3)]",
        // The client primary: ochre gold, ink text, hard block shadow.
        harvest:
          "bg-harvest text-ink shadow-[3px_3px_0_rgb(31_33_28/0.3)] hover:translate-x-px hover:translate-y-px hover:bg-harvest hover:shadow-[2px_2px_0_rgb(31_33_28/0.3)]",
        outline:
          "shadow-doc-sm border-[2.5px] border-forest bg-transparent text-forest hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgb(89_82_59/0.4)] aria-expanded:bg-soil/5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "font-semibold text-soil hover:bg-soil/8 hover:text-ink aria-expanded:bg-soil/8 aria-expanded:text-ink",
        destructive:
          "bg-error/10 text-error hover:bg-error/20 focus-visible:border-error/40 focus-visible:ring-error/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // HTML defaults a button inside a form to type="submit", which turns
      // any decorative button (dialog close, edit toggle) into an accidental
      // form submit. Opt IN to submitting; never fall into it.
      {...(asChild ? {} : { type: type ?? "button" })}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
