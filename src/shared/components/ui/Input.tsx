import clsx from 'clsx'
import type { InputHTMLAttributes, ReactNode } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean
    label?: string
    helperText?: string
    leftIcon?: ReactNode
    rightIcon?: ReactNode
}

/**
 * Input Component (Responsive + Accessible)
 * - Desktop: Compact (32px)
 * - Mobile: Touch-friendly (44px)
 * - rem 기반으로 브라우저 설정 존중
 */
export function Input({
    error,
    label,
    helperText,
    leftIcon,
    rightIcon,
    className,
    disabled,
    id,
    ...props
}: InputProps) {
    return (
        <div className={clsx('flex flex-col gap-1', className)}>
            {label && (
                <label
                    htmlFor={id}
                    className="text-sm font-medium text-[var(--color-label-secondary)] ml-0.5"
                >
                    {label}
                </label>
            )}

            <div className="relative flex items-center">
                {leftIcon && (
                    <div className="absolute left-3 sm:left-2.5 text-[var(--color-label-tertiary)] pointer-events-none flex items-center">
                        {leftIcon}
                    </div>
                )}

                <input
                    id={id}
                    disabled={disabled}
                    className={clsx(
                        // Base & 반응형 높이
                        'w-full h-11 sm:h-8', // 44px mobile, 32px desktop
                        'bg-[var(--color-surface)]',
                        'border text-base', // 16px
                        'rounded-[var(--radius-sm)]',
                        'text-[var(--color-label-primary)] placeholder-[var(--color-label-tertiary)]',
                        'transition-all duration-100',

                        // Padding (반응형)
                        leftIcon ? 'pl-10 sm:pl-8' : 'pl-3 sm:pl-2.5',
                        rightIcon ? 'pr-10 sm:pr-8' : 'pr-3 sm:pr-2.5',

                        // Border & State
                        error
                            ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20'
                            : 'border-[var(--color-border-default)] hover:border-[var(--color-border-default)] focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]/20',

                        // Focus (접근성)
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',

                        // Disabled
                        disabled && 'opacity-60 cursor-not-allowed bg-[var(--color-canvas)]'
                    )}
                    {...props}
                />

                {rightIcon && (
                    <div className="absolute right-3 sm:right-2.5 text-[var(--color-label-tertiary)] pointer-events-none flex items-center">
                        {rightIcon}
                    </div>
                )}
            </div>

            {helperText && (
                <span
                    className={clsx(
                        'text-xs ml-0.5',
                        error ? 'text-[var(--color-danger)]' : 'text-[var(--color-label-tertiary)]'
                    )}
                >
                    {helperText}
                </span>
            )}
        </div>
    )
}
