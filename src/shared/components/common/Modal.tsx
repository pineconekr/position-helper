'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import Icon from '../ui/Icon'
import { Button } from '../ui/Button'
import clsx from 'clsx'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface ModalProps {
    open: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    footer?: ReactNode
    size?: ModalSize
}

const sizes: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full m-4',
}

export default function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md',
}: ModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (open) {
            setIsVisible(true)
            document.body.style.overflow = 'hidden'
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200)
            document.body.style.overflow = 'unset'
            return () => clearTimeout(timer)
        }
    }, [open])

    if (!mounted) return null
    if (!isVisible && !open) return null

    return createPortal(
        <div
            className={clsx(
                'fixed inset-0 z-50 flex items-center justify-center p-4',
                'transition-opacity duration-200',
                open ? 'opacity-100' : 'opacity-0'
            )}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={clsx(
                    'relative w-full bg-[var(--color-surface-elevated)]',
                    'rounded-[var(--radius-lg)] shadow-xl',
                    'border border-[var(--color-border-subtle)]',
                    'transform transition-all duration-200',
                    open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2',
                    sizes[size]
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
                    <h3 className="text-lg font-semibold text-[var(--color-label-primary)]">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-[var(--radius-sm)] text-[var(--color-label-tertiary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-label-secondary)] transition-colors"
                    >
                        <Icon name="close" size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto max-h-[70vh]">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-2 px-5 py-4 bg-[var(--color-surface)]/50 border-t border-[var(--color-border-subtle)] rounded-b-[var(--radius-lg)]">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
