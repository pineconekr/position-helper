import React from 'react'
import { clsx } from 'clsx'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				ref={ref}
				className={clsx(
					'w-full px-3 py-2.5 text-[0.9375rem] font-inherit min-h-[100px] resize-y',
					'bg-[var(--color-surface-1)] text-[var(--color-text-primary)]',
					'border border-[var(--color-border-subtle)] rounded-xl',
					'outline-none transition-all duration-150',
					'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-blue-500/40',
					'placeholder:text-[var(--color-text-subtle)]',
					className
				)}
				{...props}
			/>
		)
	}
)

Textarea.displayName = 'Textarea'
