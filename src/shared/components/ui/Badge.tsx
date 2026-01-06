import clsx from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeVariant = 'default' | 'neutral' | 'outline' | 'success' | 'warning' | 'danger' | 'accent'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariant
    size?: 'sm' | 'md'
    children: ReactNode
}

/**
 * Badge Component (Responsive + Accessible)
 * - rem 기반으로 브라우저 설정 존중
 * - 모바일에서도 읽기 쉬운 크기
 * - CSS 변수 기반 테마 (dark: 접두사 미사용)
 */
const variants: Record<BadgeVariant, string> = {
    default: 'bg-[var(--color-surface-elevated)] text-[var(--color-label-primary)] border border-[var(--color-border-default)]',
    neutral: 'bg-[var(--color-surface)] text-[var(--color-label-secondary)] border border-transparent',
    outline: 'bg-transparent text-[var(--color-label-secondary)] border border-[var(--color-border-default)]',

    // Colored Variants - Using CSS Variables for consistent theming
    accent: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20',
    success: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20',
    warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/20',
    danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20',
}

// 반응형 사이즈: 모바일에서 약간 더 크게
const sizes = {
    sm: 'text-xs px-2 sm:px-1.5 h-6 sm:h-5',
    md: 'text-sm px-2.5 sm:px-2 h-7 sm:h-6',
}

export function Badge({ variant = 'default', size = 'md', className, children, ...props }: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center justify-center font-medium rounded-[0.25rem]',
                'whitespace-nowrap select-none',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </span>
    )
}
