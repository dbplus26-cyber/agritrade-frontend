import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-[2px] border-[1.5px] border-soil/35 bg-paper px-3 py-1 text-base text-ink transition-[border-color,box-shadow] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-soil/55 focus-visible:border-leaf focus-visible:shadow-[0_0_0_3px_rgb(62_125_98/0.16)] focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60 aria-invalid:border-error md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
