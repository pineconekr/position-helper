'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/shared/components/common/ThemeToggle'
import ToastCenter from '@/shared/components/common/ToastCenter'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import Icon from '@/shared/components/ui/Icon'
import './globals.css'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ko" suppressHydrationWarning>
            <head />
            <body>
                <ThemeProvider>
                    <AppShell>{children}</AppShell>
                    <ToastCenter />
                </ThemeProvider>
            </body>
        </html>
    )
}

function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    const navLinks = [
        { href: '/', label: '배정' },
        { href: '/stats', label: '통계' },
        { href: '/members', label: '팀원' },
        { href: '/settings', label: '설정' },
    ]

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/'
        return pathname.startsWith(href)
    }

    return (
        <div className="grid grid-rows-[auto_1fr] h-screen">
            {/* Header */}
            <header className="flex items-center gap-4 px-5 min-h-14 flex-wrap bg-[var(--color-surface-2)] border-b border-[var(--color-border-subtle)] backdrop-blur-xl">
                {/* Brand */}
                <div className="flex items-center gap-2 font-bold tracking-tight text-lg shrink-0">
                    <Icon name="photo_camera" size={20} aria-hidden />
                    <span>Position Helper</span>
                </div>

                {/* Navigation */}
                <nav className="flex gap-3 overflow-x-auto flex-1 min-w-0 pb-0.5">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all duration-150
								${isActive(link.href)
                                    ? 'text-[var(--color-text-primary)] bg-[var(--color-accent-soft)] font-semibold'
                                    : 'text-[var(--color-text-muted)] hover:-translate-y-0.5'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <ThemeToggle />
            </header>

            {/* Main Content */}
            <main className="p-6 overflow-auto flex justify-center">
                <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
                    {children}
                </div>
            </main>
        </div>
    )
}
