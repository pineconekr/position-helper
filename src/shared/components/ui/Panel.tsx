import React from 'react'
import { clsx } from 'clsx'

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> { }

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={clsx(
					'bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]',
					'rounded-2xl shadow-sm backdrop-blur-xl',
					'transition-all duration-200',
					className
				)}
				{...props}
			>
				{children}
			</div>
		)
	}
)

Panel.displayName = 'Panel'
