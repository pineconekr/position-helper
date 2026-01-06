'use client'

import clsx from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Components for Loading States
// ─────────────────────────────────────────────────────────────────────────────

interface SkeletonProps {
    className?: string
    animation?: 'pulse' | 'shimmer' | 'none'
    style?: React.CSSProperties
}

/**
 * Base Skeleton component with animation
 */
export function Skeleton({ className, animation = 'pulse', style }: SkeletonProps) {
    return (
        <div
            className={clsx(
                'bg-[var(--color-surface-elevated)] rounded-[var(--radius-sm)]',
                animation === 'pulse' && 'animate-pulse',
                animation === 'shimmer' && 'skeleton-shimmer',
                className
            )}
            style={style}
            aria-hidden="true"
        />
    )
}

/**
 * Text skeleton - simulates text lines
 */
export function SkeletonText({
    lines = 1,
    className,
    lastLineWidth = '60%'
}: {
    lines?: number
    className?: string
    lastLineWidth?: string
}) {
    return (
        <div className={clsx('space-y-2', className)} aria-hidden="true">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="h-4"
                    style={{
                        width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%'
                    }}
                />
            ))}
        </div>
    )
}

/**
 * Card skeleton - simulates a data card
 */
export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div
            className={clsx(
                'p-4 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)]',
                'bg-[var(--color-surface)]',
                className
            )}
            aria-hidden="true"
        >
            <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <SkeletonText lines={2} />
        </div>
    )
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
    return (
        <tr aria-hidden="true">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                </td>
            ))}
        </tr>
    )
}

/**
 * Full-page loading skeleton
 */
export function PageSkeleton() {
    return (
        <div className="space-y-6 animate-pulse" aria-label="페이지 로딩 중">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-[var(--radius-sm)]" />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
            </div>

            {/* Table */}
            <div className="border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
                <div className="bg-[var(--color-surface-elevated)] p-4">
                    <Skeleton className="h-5 w-32" />
                </div>
                <table className="w-full">
                    <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <SkeletonTableRow key={i} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State Components
// ─────────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
    icon?: string
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
    className?: string
}

/**
 * Empty State component with icon, title, description, and optional CTA
 */
export function EmptyState({
    icon = 'block',
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center py-12 px-6 text-center',
                className
            )}
            role="status"
            aria-label={title}
        >
            {/* Icon Container */}
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4 border border-[var(--color-border-subtle)]">
                <EmptyStateIcon name={icon} />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-[var(--color-label-primary)] mb-1">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="text-sm text-[var(--color-label-secondary)] max-w-xs mb-4">
                    {description}
                </p>
            )}

            {/* Action Button */}
            {action && (
                <button
                    onClick={action.onClick}
                    className={clsx(
                        'inline-flex items-center gap-2 px-4 py-2',
                        'text-sm font-medium text-[var(--color-accent)]',
                        'bg-[var(--color-accent)]/10 rounded-[var(--radius-sm)]',
                        'hover:bg-[var(--color-accent)]/20 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30'
                    )}
                >
                    {action.label}
                </button>
            )}
        </div>
    )
}

// Simple icon component for empty states (using inline SVG for common patterns)
function EmptyStateIcon({ name }: { name: string }) {
    // Import the Icon component dynamically to avoid circular dependency issues
    // For now, use a simple SVG representation
    const icons: Record<string, React.ReactNode> = {
        block: (
            <svg className="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                <path d="m4.93 4.93 14.14 14.14" strokeWidth="1.5" />
            </svg>
        ),
        search: (
            <svg className="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
                <path d="m21 21-4.35-4.35" strokeWidth="1.5" />
            </svg>
        ),
        users: (
            <svg className="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="1.5" />
                <circle cx="9" cy="7" r="4" strokeWidth="1.5" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="1.5" />
            </svg>
        ),
        calendar: (
            <svg className="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
                <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5" />
            </svg>
        ),
        chart: (
            <svg className="w-7 h-7 text-[var(--color-label-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M18 20V10M12 20V4M6 20v-6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        )
    }

    return icons[name] || icons.block
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS for shimmer animation (add to globals.css if needed)
// ─────────────────────────────────────────────────────────────────────────────

/*
.skeleton-shimmer {
    position: relative;
    overflow: hidden;
}

.skeleton-shimmer::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
    );
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    100% {
        transform: translateX(100%);
    }
}
*/

export default {
    Skeleton,
    SkeletonText,
    SkeletonCard,
    SkeletonTableRow,
    PageSkeleton,
    EmptyState
}
