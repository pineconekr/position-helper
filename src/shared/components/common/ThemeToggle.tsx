'use client'

import { useEffect, useState } from 'react'
import Icon from '../ui/Icon'
import clsx from 'clsx'

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Check initial theme from document
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        setTheme(isDark ? 'dark' : 'light')
    }, [])

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
        localStorage.setItem('theme', newTheme)
    }

    if (!mounted) {
        return <div className="w-8 h-8" /> // Placeholder to prevent layout shift
    }

    return (
        <button
            onClick={toggleTheme}
            className={clsx(
                'flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)]',
                'text-[var(--color-label-secondary)] hover:text-[var(--color-label-primary)]',
                'hover:bg-[var(--color-surface-elevated)] transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
            )}
            title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
        >
            <Icon
                name={theme === 'light' ? 'dark_mode' : 'light_mode'}
                size={18}
            />
        </button>
    )
}
