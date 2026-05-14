import { cn } from "@/lib/utils"

const variantClasses = {
  default:     "bg-primary text-primary-foreground",
  secondary:   "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive/10 text-destructive",
  outline:     "border border-border text-foreground",
  ghost:       "hover:bg-muted hover:text-muted-foreground",
}

function Badge({ className, variant = "default", children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[variant] ?? variantClasses.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge }
