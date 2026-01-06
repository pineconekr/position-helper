import clsx from 'clsx'
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
    noPadding?: boolean
    hover?: boolean
    borderless?: boolean
    children: ReactNode
}

/**
 * Panel Component (Refactored)
 * - Replaces 'Card'
 * - Clean surface with subtle border
 * - Minimal or no shadow by default
 * - Supports ref forwarding
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(({
    noPadding,
    hover,
    borderless,
    className,
    children,
    ...props
}, ref) => {
    return (
        <div
            ref={ref}
            className={clsx(
                // Base
                'bg-[var(--color-surface-elevated)]',
                'rounded-[var(--radius-md)]',

                // Border
                !borderless && 'border border-[var(--color-border-subtle)]',

                // Hover
                hover && 'transition-colors hover:border-[var(--color-border-default)]',

                // Shadow (Apple Style: Very subtle)
                'shadow-sm shadow-black/[0.02]',

                // Padding
                !noPadding && 'p-4',

                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})

Panel.displayName = 'Panel'
