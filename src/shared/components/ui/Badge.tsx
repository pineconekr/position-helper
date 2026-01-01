import React from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'neutral' | 'accent' | 'critical' | 'success' | 'warning'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
	neutral: 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]',
	accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-transparent',
	critical: 'bg-[var(--color-critical-soft)] text-[var(--color-critical)] border-transparent',
	success: 'bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent',
	warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent',
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant = 'neutral', children, ...props }, ref) => {
		return (
			<span
				ref={ref}
				className={clsx(
					'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border',
					'transition-colors duration-150',
					variantStyles[variant],
					className
				)}
				{...props}
			>
				{children}
			</span>
		)
	}
)

Badge.displayName = 'Badge'
