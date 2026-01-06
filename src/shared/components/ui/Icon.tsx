'use client'

import * as HeroIconsOutline from '@heroicons/react/24/outline'
import * as HeroIconsSolid from '@heroicons/react/24/solid'
import { ComponentType, SVGProps } from 'react'

// Material Symbol to Heroicon mapping
const iconMap: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
    // Navigation & UI
    close: HeroIconsOutline.XMarkIcon,
    expand_more: HeroIconsOutline.ChevronDownIcon,
    expand_less: HeroIconsOutline.ChevronUpIcon,
    chevron_right: HeroIconsOutline.ChevronRightIcon,
    chevron_left: HeroIconsOutline.ChevronLeftIcon,
    search: HeroIconsOutline.MagnifyingGlassIcon,
    add: HeroIconsOutline.PlusIcon,
    edit: HeroIconsOutline.PencilIcon,
    edit_square: HeroIconsOutline.PencilSquareIcon,
    delete: HeroIconsOutline.TrashIcon,
    check: HeroIconsOutline.CheckIcon,
    check_circle: HeroIconsSolid.CheckCircleIcon,

    // Theme
    light_mode: HeroIconsOutline.SunIcon,
    dark_mode: HeroIconsOutline.MoonIcon,

    // Status & Feedback
    info: HeroIconsOutline.InformationCircleIcon,
    warning: HeroIconsOutline.ExclamationTriangleIcon,
    error: HeroIconsSolid.ExclamationCircleIcon,
    block: HeroIconsOutline.NoSymbolIcon,
    verified: HeroIconsSolid.CheckBadgeIcon,
    thumb_up: HeroIconsOutline.HandThumbUpIcon,
    thumb_up_alt: HeroIconsOutline.HandThumbUpIcon,
    lightbulb: HeroIconsOutline.LightBulbIcon,

    // Camera & Media
    photo_camera: HeroIconsOutline.CameraIcon,

    // Calendar & Time
    event_busy: HeroIconsOutline.CalendarDaysIcon,
    event_available: HeroIconsSolid.CalendarDaysIcon,
    edit_calendar: HeroIconsOutline.CalendarIcon,
    calendar_month: HeroIconsOutline.CalendarDaysIcon,
    sunny: HeroIconsOutline.SunIcon,
    nightlight: HeroIconsOutline.MoonIcon,
    history: HeroIconsOutline.ClockIcon,

    // People & Users
    person: HeroIconsOutline.UserIcon,
    person_remove: HeroIconsOutline.UserMinusIcon,
    person_off: HeroIconsOutline.UserMinusIcon,
    person_add: HeroIconsOutline.UserPlusIcon,
    assignment_ind: HeroIconsOutline.ClipboardDocumentCheckIcon,
    assignment: HeroIconsOutline.ClipboardDocumentListIcon,
    group: HeroIconsOutline.UserGroupIcon,
    groups: HeroIconsOutline.UserGroupIcon,
    visibility: HeroIconsOutline.EyeIcon,
    visibility_off: HeroIconsOutline.EyeSlashIcon,

    // Settings & System
    settings: HeroIconsOutline.Cog6ToothIcon,
    computer: HeroIconsOutline.ComputerDesktopIcon,
    database: HeroIconsOutline.CircleStackIcon,
    palette: HeroIconsOutline.SwatchIcon,
    category: HeroIconsOutline.TagIcon,

    // Motion & Animation
    motion_mode: HeroIconsOutline.SparklesIcon,
    auto_awesome: HeroIconsOutline.SparklesIcon,
    eco: HeroIconsOutline.BoltSlashIcon,

    // Actions
    sync: HeroIconsOutline.ArrowPathIcon,
    repeat: HeroIconsOutline.ArrowPathIcon,
    sync_alt: HeroIconsOutline.ArrowsRightLeftIcon,
    arrow_forward: HeroIconsOutline.ArrowRightIcon,
    restart_alt: HeroIconsOutline.ArrowPathIcon,

    // Balance & Stats
    bar_chart: HeroIconsOutline.ChartBarIcon,
    balance: HeroIconsOutline.ScaleIcon,
    school: HeroIconsOutline.AcademicCapIcon,
    spa: HeroIconsOutline.HeartIcon,
    avg_pace: HeroIconsOutline.ChartBarIcon,
    insert_chart: HeroIconsOutline.ChartBarSquareIcon,
    chart_bar: HeroIconsOutline.ChartBarIcon,
    chart_pie: HeroIconsOutline.ChartPieIcon,

    // File Actions
    upload: HeroIconsOutline.ArrowUpTrayIcon,
    download: HeroIconsOutline.ArrowDownTrayIcon,

    // AI & Auto
    auto_fix: HeroIconsOutline.SparklesIcon,

    // Additional UI Icons
    notifications: HeroIconsOutline.BellIcon,
    drag_indicator: HeroIconsOutline.Bars2Icon,
    edit_note: HeroIconsOutline.DocumentTextIcon,

    // Solid Variants for KPI Cards (Consistent Look)
    thumb_up_solid: HeroIconsSolid.HandThumbUpIcon,
    scale_solid: HeroIconsSolid.ScaleIcon,
    warning_solid: HeroIconsSolid.ExclamationTriangleIcon,
    sparkles_solid: HeroIconsSolid.SparklesIcon,
}

// Strict type for icon names - removes string union for type safety
export type IconName = keyof typeof iconMap

// Helper to check if a string is a valid icon name
export function isValidIconName(name: string): name is IconName {
    return name in iconMap
}

// Get all available icon names
export const ICON_NAMES = Object.keys(iconMap) as IconName[]

interface IconProps {
    name: IconName | string // Allow string for backward compatibility, but prefer IconName
    className?: string
    size?: number | string
    style?: React.CSSProperties
    // Enhanced accessibility props
    'aria-hidden'?: boolean
    'aria-label'?: string
    role?: 'img' | 'presentation'
    title?: string // For tooltip/screen reader
}

// Fallback icon component for missing icons
function FallbackIcon({ size, className, style }: { size?: string; className?: string; style?: React.CSSProperties }) {
    return (
        <svg
            className={className}
            style={{
                width: size || '1em',
                height: size || '1em',
                flexShrink: 0,
                ...style
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor">?</text>
        </svg>
    )
}

export function Icon({
    name,
    className = '',
    size,
    style,
    'aria-hidden': ariaHidden = true,
    'aria-label': ariaLabel,
    role,
    title,
    ...props
}: IconProps) {
    const IconComponent = iconMap[name as IconName]
    const sizeValue = typeof size === 'number' ? `${size}px` : size

    if (!IconComponent) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`Icon "${name}" not found in icon map. Available: ${ICON_NAMES.slice(0, 5).join(', ')}...`)
        }
        return <FallbackIcon size={sizeValue} className={className} style={style} />
    }

    // Determine accessibility attributes
    const accessibilityProps: Record<string, unknown> = {}

    if (title || ariaLabel) {
        // Decorative icons should be hidden from screen readers
        accessibilityProps['aria-hidden'] = false
        accessibilityProps['aria-label'] = ariaLabel || title
        accessibilityProps['role'] = role || 'img'
    } else {
        accessibilityProps['aria-hidden'] = ariaHidden
    }

    return (
        <IconComponent
            className={className}
            style={{
                width: sizeValue || '1em',
                height: sizeValue || '1em',
                flexShrink: 0,
                ...style
            }}
            {...accessibilityProps}
            {...props}
        />
    )
}

export default Icon
