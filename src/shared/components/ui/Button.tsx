import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Icon from './Icon'

type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: string
    iconPosition?: 'left' | 'right'
    loading?: boolean
    children?: ReactNode
}

/**
 * Button Component (Responsive + Accessible)
 * - Desktop: Compact (32px)
 * - Mobile: Touch-friendly (44px)
 * - rem 기반으로 브라우저 설정 존중
 */
const variants: Record<ButtonVariant, string> = {
    solid: clsx(
        'bg-[var(--color-accent)] text-white border border-transparent',
        'hover:opacity-90 active:scale-[0.98]',
        'shadow-sm shadow-black/5'
    ),
    outline: clsx(
        'bg-[var(--color-surface)] text-[var(--color-label-primary)]',
        'border border-[var(--color-border-default)]',
        'hover:bg-[var(--color-canvas)] hover:border-[var(--color-border-subtle)] active:scale-[0.98]',
        'shadow-sm shadow-black/5'
    ),
    ghost: clsx(
        'bg-transparent text-[var(--color-label-secondary)] border-transparent',
        'hover:bg-[var(--color-surface)] hover:text-[var(--color-label-primary)]',
        'active:scale-[0.98]'
    ),
    danger: clsx(
        'bg-[var(--color-danger)] text-white border border-transparent',
        'hover:opacity-90 active:scale-[0.98]',
        'shadow-sm shadow-red-500/20'
    ),
}

// 반응형 사이즈: 모바일에서는 터치 친화적, 데스크톱에서는 컴팩트
const sizes: Record<ButtonSize, string> = {
    sm: clsx(
        'h-10 sm:h-7',           // 40px mobile, 28px desktop
        'px-3 sm:px-2.5',
        'text-sm', // 14px
        'gap-1.5 sm:gap-1',
        'rounded-[var(--radius-sm)]'
    ),
    md: clsx(
        'h-11 sm:h-8',           // 44px mobile (터치 기준), 32px desktop
        'px-4 sm:px-3.5',
        'text-base', // 16px
        'gap-2 sm:gap-1.5',
        'rounded-[var(--radius-sm)]'
    ),
}

const iconSizes: Record<ButtonSize, number> = {
    sm: 16,
    md: 18,
}

export function Button({
    variant = 'solid',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled,
    className,
    children,
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading

    return (
        <button
            type="button"
            disabled={isDisabled}
            className={clsx(
                // Base
                'inline-flex items-center justify-center font-medium select-none',
                'transition-all duration-100 ease-out',
                // Focus (접근성)
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[var(--color-accent)]/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-canvas)]',
                // Variant & Size
                variants[variant],
                sizes[size],
                // Disabled
                isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none grayscale',
                className
            )}
            {...props}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : icon && iconPosition === 'left' ? (
                <Icon name={icon} size={iconSizes[size]} />
            ) : null}

            {children && <span>{children}</span>}

            {!loading && icon && iconPosition === 'right' && (
                <Icon name={icon} size={iconSizes[size]} />
            )}
        </button>
    )
}
