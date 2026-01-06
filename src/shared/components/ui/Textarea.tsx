import clsx from 'clsx'
import type { TextareaHTMLAttributes } from 'react'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	error?: boolean
	label?: string
	helperText?: string
}

/**
 * Textarea Component (Responsive + Accessible)
 * - rem 기반으로 브라우저 설정 존중
 * - 터치 친화적 패딩
 */
export function Textarea({
	error = false,
	label,
	helperText,
	className,
	id,
	...props
}: TextareaProps) {
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

			<textarea
				id={id}
				className={clsx(
					// Base & 반응형 패딩
					'w-full min-h-[5rem]',
					'px-3 sm:px-2.5 py-3 sm:py-2',
					'text-base', // 16px
					'rounded-[var(--radius-sm)] resize-y',
					// Colors
					'bg-[var(--color-surface)]',
					'text-[var(--color-label-primary)] placeholder-[var(--color-label-tertiary)]',
					// Border
					error
						? 'border border-[var(--color-danger)]'
						: 'border border-[var(--color-border-default)] hover:border-[var(--color-border-default)]',
					// Focus (접근성)
					'focus:outline-none focus:ring-2 focus:ring-offset-0',
					error
						? 'focus:ring-[var(--color-danger)]/20 focus:border-[var(--color-danger)]'
						: 'focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]',
					// Transition
					'transition-all duration-100',
					// Disabled
					'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[var(--color-canvas)]'
				)}
				{...props}
			/>

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
