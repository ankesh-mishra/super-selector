import * as React from "react"
import { cn } from "@/lib/utils"

// Native <select> styled to match shadcn Input — simpler than the full
// headless Select for admin forms with many static options.
function NativeSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export { NativeSelect }
