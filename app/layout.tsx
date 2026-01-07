'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import clsx from 'clsx'
import ThemeToggle from '@/shared/components/common/ThemeToggle'
import ToastCenter from '@/shared/components/common/ToastCenter'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import Icon from '@/shared/components/ui/Icon'
import { useShouldReduceMotion } from '@/shared/utils/motion'
import { DbSyncProvider } from '@/shared/components/providers/DbSyncProvider'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
            </head>
            <body className="font-sans antialiased bg-[var(--color-canvas)] text-[var(--color-label-primary)] transition-colors duration-300">
                <ThemeProvider>
                    <MotionSettingsSync />
                    <DbSyncProvider>
                        <AppShell>{children}</AppShell>
                    </DbSyncProvider>
                    <ToastCenter />
                </ThemeProvider>
            </body>
        </html>
    )
}

function MotionSettingsSync() {
    const shouldReduce = useShouldReduceMotion()
    useEffect(() => {
        document.documentElement.setAttribute('data-reduce-motion', shouldReduce ? 'true' : 'false')
    }, [shouldReduce])
    return null
}

const navLinks = [
    { href: '/', label: '배정', icon: 'assignment' },
    { href: '/stats', label: '통계', icon: 'bar_chart' },
    { href: '/members', label: '팀원', icon: 'group' },
    { href: '/settings', label: '설정', icon: 'settings' },
]

function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

    return (
        <div className="min-h-screen">
            {/* Header - Compact (h-12) & Glassmorphism */}
            <header className={clsx(
                'sticky top-0 z-50 w-full h-12',
                'bg-[var(--color-surface)]/80 backdrop-blur-md', // Enhanced Glass
                'border-b border-[var(--color-border-subtle)]',
                'flex items-center'
            )}>
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                    {/* Logo area */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                            <Icon name="photo_camera" size={14} aria-hidden />
                        </div>
                        <span className="text-[13px] font-semibold tracking-tight">
                            Position Helper
                        </span>
                    </div>

                    {/* Nav - Minimal Tabs */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={clsx(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)]',
                                    'text-[13px] font-medium transition-all duration-200',
                                    isActive(link.href)
                                        ? 'bg-[var(--color-surface-elevated)] text-[var(--color-label-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-[var(--color-label-secondary)] hover:bg-[var(--color-surface-elevated)]/50 hover:text-[var(--color-label-primary)]'
                                )}
                            >
                                <Icon name={link.icon} size={15} className={isActive(link.href) ? 'text-[var(--color-accent)]' : 'opacity-70'} />
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </div>

                {/* Mobile Nav - With Icons & Touch-friendly */}
                <nav className="md:hidden absolute top-12 left-0 w-full bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] overflow-x-auto scrollbar-hide">
                    <div className="flex px-4 h-12 items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={clsx(
                                    'flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium',
                                    'min-h-[44px]', // Apple HIG touch target
                                    'transition-colors duration-150',
                                    isActive(link.href)
                                        ? 'bg-[var(--color-surface-elevated)] text-[var(--color-label-primary)] shadow-sm ring-1 ring-black/5'
                                        : 'text-[var(--color-label-secondary)] hover:text-[var(--color-label-primary)]'
                                )}
                            >
                                <Icon name={link.icon} size={16} className={isActive(link.href) ? 'text-[var(--color-accent)]' : 'opacity-60'} />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
                {children}
            </main>
        </div>
    )
}
