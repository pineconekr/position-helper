import React, { ReactNode } from 'react'
import { clsx } from 'clsx'
import Icon, { IconName } from './Icon'

type ButtonVariant = 'primary' | 'secondary' | 'critical' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant
	size?: ButtonSize
	icon?: IconName
	children?: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
	primary: 'bg-[var(--color-accent)] text-white border-transparent shadow-md hover:shadow-lg',
	secondary: 'bg-[var(--color-surface-1)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)]',
	critical: 'bg-[var(--color-critical)] text-white border-transparent',
	ghost: 'bg-transparent text-[var(--color-text-muted)] border-transparent hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]',
}

const sizeStyles: Record<ButtonSize, string> = {
	sm: 'px-3 py-1.5 text-sm gap-1.5',
	md: 'px-4 py-2 gap-2',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'secondary', size = 'md', icon, children, ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={clsx(
					'inline-flex items-center justify-center font-medium rounded-xl border cursor-pointer',
					'transition-all duration-150 hover:scale-[1.02] hover:opacity-95',
					'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
					variantStyles[variant],
					sizeStyles[size],
					className
				)}
				{...props}
			>
				{icon && (
					<Icon name={icon} size={size === 'sm' ? 16 : 18} style={{ marginRight: children ? 4 : 0 }} />
				)}
				{children}
			</button>
		)
	}
)

Button.displayName = 'Button'
