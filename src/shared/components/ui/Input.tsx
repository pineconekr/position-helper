import React from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, ...props }, ref) => {
		return (
			<input
				ref={ref}
				className={clsx(
					'w-full px-3 py-2 text-[0.9375rem]',
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

Input.displayName = 'Input'
