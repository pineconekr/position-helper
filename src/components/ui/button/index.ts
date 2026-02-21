import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Button } from "./Button.vue"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[11px] text-[0.92rem] font-medium cursor-pointer transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/30 aria-invalid:border-destructive active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)] hover:bg-primary/92",
        solid:
          "border border-transparent bg-primary text-primary-foreground shadow-[var(--shadow-button-primary)] hover:bg-primary/92",
        destructive:
          "border border-transparent bg-[var(--color-danger)] text-white shadow-[var(--shadow-button-primary)] hover:bg-[var(--color-danger)]/92 focus-visible:ring-[var(--color-danger)]/30",
        outline:
          "border border-border bg-background/92 text-foreground shadow-[var(--shadow-button-soft)] hover:bg-accent/70",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground shadow-[var(--shadow-button-soft)] hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-10 px-4 py-2 has-[>svg]:px-3",
        "sm": "h-9 rounded-[10px] gap-1.5 px-3 has-[>svg]:px-2.5",
        "lg": "h-11 rounded-[12px] px-6 has-[>svg]:px-4",
        "icon": "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
