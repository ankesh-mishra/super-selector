import { cn } from "@/lib/utils"

const variantClasses = {
  default:     "bg-primary text-primary-foreground hover:opacity-90",
  outline:     "border border-border bg-background hover:bg-muted text-foreground",
  secondary:   "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost:       "hover:bg-muted text-foreground",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  link:        "text-primary underline-offset-4 hover:underline",
}

const sizeClasses = {
  default: "h-8 px-3 text-sm gap-1.5",
  sm:      "h-7 px-2.5 text-xs gap-1",
  lg:      "h-9 px-4 text-sm gap-1.5",
  icon:    "size-8",
  xs:      "h-6 px-2 text-xs gap-1",
}

function Button({ className, variant = "default", size = "default", children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant] ?? variantClasses.default,
        sizeClasses[size]   ?? sizeClasses.default,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button }
