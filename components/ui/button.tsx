import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent font-semibold tracking-[-0.01em] outline-none transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out select-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_6px_18px_color-mix(in_oklab,var(--primary)_24%,transparent)] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_10px_26px_color-mix(in_oklab,var(--primary)_30%,transparent)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/75",
        outline:
          "border-border bg-card text-foreground shadow-xs hover:border-foreground/20 hover:bg-muted/60",
        ghost:
          "bg-transparent text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-white shadow-sm hover:-translate-y-px hover:bg-destructive/90",
        inverse:
          "bg-foreground text-background shadow-sm hover:-translate-y-px hover:bg-foreground/85",
        link:
          "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-8 rounded-lg px-3 text-xs",
        sm: "h-9 rounded-[0.625rem] px-3.5 text-sm",
        default: "h-11 px-5 text-sm",
        lg: "h-13 rounded-[0.875rem] px-6 text-base",
        xl: "h-14 rounded-2xl px-8 text-base",
        icon: "size-11 p-0",
        "icon-sm": "size-9 rounded-[0.625rem] p-0",
        "icon-lg": "size-13 rounded-[0.875rem] p-0",
      },
      width: {
        auto: "w-auto",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      width: "auto",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  width = "auto",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, width, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
