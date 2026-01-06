'use client'

import { useToast } from '@/shared/hooks/useToast'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'
import clsx from 'clsx'

// Define explicit toast type locally if needed or assume hook provides it 
// but mapping requires a hint
type ToastItem = {
    id: string
    title?: string
    description?: string
    kind?: 'info' | 'success' | 'warning' | 'error'
    action?: { label: string; onClick: () => void }
}

export default function ToastCenter() {
    const { toasts, remove } = useToast()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return createPortal(
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast: ToastItem) => (
                <div
                    key={toast.id}
                    className={clsx(
                        'pointer-events-auto w-80 p-4 rounded-[var(--radius-md)] shadow-lg',
                        'border animate-in slide-in-from-bottom-5 fade-in duration-300',
                        'bg-[var(--color-surface-elevated)]', // Default Base
                        // Use semantic CSS variables instead of dark: prefixes
                        toast.kind === 'error' && 'border-[var(--color-danger)]/30 text-[var(--color-danger)]',
                        toast.kind === 'success' && 'border-[var(--color-success)]/30 text-[var(--color-success)]',
                        toast.kind === 'warning' && 'border-[var(--color-warning)]/30 text-[var(--color-warning)]',
                        (toast.kind === 'info' || !toast.kind) && 'border-[var(--color-border-subtle)] text-[var(--color-label-primary)]'
                    )}
                    role="alert"
                    aria-live="polite"
                    style={{
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                    }}
                >
                    <div className="flex items-start gap-3">
                        <div className={clsx(
                            'shrink-0 mt-0.5',
                            toast.kind === 'error' && 'text-red-500',
                            toast.kind === 'success' && 'text-emerald-500',
                            (toast.kind === 'info' || !toast.kind) && 'text-blue-500'
                        )}>
                            <Icon
                                name={
                                    toast.kind === 'error' ? 'error' :
                                        toast.kind === 'success' ? 'check_circle' :
                                            'info'
                                }
                                size={20}
                            />
                        </div>
                        <div className="flex-1">
                            {toast.title && (
                                <h4 className="font-semibold text-sm mb-1 leading-none">{toast.title}</h4>
                            )}
                            {toast.description && (
                                <p className="text-sm opacity-90 leading-relaxed">{toast.description}</p>
                            )}
                        </div>
                        <button
                            onClick={() => remove(toast.id)}
                            className="shrink-0 text-current opacity-40 hover:opacity-100 transition-opacity"
                        >
                            <Icon name="close" size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>,
        document.body
    )
}
