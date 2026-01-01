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

    // Camera & Media
    photo_camera: HeroIconsOutline.CameraIcon,

    // Calendar & Time
    event_busy: HeroIconsOutline.CalendarDaysIcon,
    event_available: HeroIconsSolid.CalendarDaysIcon,
    edit_calendar: HeroIconsOutline.CalendarIcon,
    sunny: HeroIconsOutline.SunIcon,
    nightlight: HeroIconsOutline.MoonIcon,
    history: HeroIconsOutline.ClockIcon,

    // People & Users
    person: HeroIconsOutline.UserIcon,
    person_remove: HeroIconsOutline.UserMinusIcon,
    person_off: HeroIconsOutline.UserMinusIcon,
    assignment_ind: HeroIconsOutline.ClipboardDocumentCheckIcon,
    visibility: HeroIconsOutline.EyeIcon,
    visibility_off: HeroIconsOutline.EyeSlashIcon,

    // Settings & System
    settings: HeroIconsOutline.Cog6ToothIcon,
    computer: HeroIconsOutline.ComputerDesktopIcon,
    database: HeroIconsOutline.CircleStackIcon,
    palette: HeroIconsOutline.SwatchIcon,

    // Motion & Animation
    motion_mode: HeroIconsOutline.SparklesIcon,
    auto_awesome: HeroIconsOutline.SparklesIcon,
    eco: HeroIconsOutline.BoltSlashIcon,

    // Actions
    sync: HeroIconsOutline.ArrowPathIcon,
    sync_alt: HeroIconsOutline.ArrowsRightLeftIcon,
    restart_alt: HeroIconsOutline.ArrowPathIcon,

    // Balance & Stats
    balance: HeroIconsOutline.ScaleIcon,
    school: HeroIconsOutline.AcademicCapIcon,
    spa: HeroIconsOutline.HeartIcon,

    // File Actions
    upload: HeroIconsOutline.ArrowUpTrayIcon,
    download: HeroIconsOutline.ArrowDownTrayIcon,

    // AI & Auto
    auto_fix: HeroIconsOutline.SparklesIcon,
}

export type IconName = keyof typeof iconMap | string

interface IconProps {
    name: IconName
    className?: string
    size?: number | string
    style?: React.CSSProperties
    'aria-hidden'?: boolean
}

export function Icon({ name, className = '', size, style, ...props }: IconProps) {
    const IconComponent = iconMap[name]

    if (!IconComponent) {
        console.warn(`Icon "${name}" not found in icon map`)
        return null
    }

    const sizeValue = typeof size === 'number' ? `${size}px` : size

    return (
        <IconComponent
            className={className}
            style={{
                width: sizeValue || '1em',
                height: sizeValue || '1em',
                flexShrink: 0,
                ...style
            }}
            {...props}
        />
    )
}

export default Icon
