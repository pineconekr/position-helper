<script setup lang="ts">
import { computed, type FunctionalComponent, type SVGAttributes } from 'vue'
import * as HeroIconsOutline from '@heroicons/vue/24/outline'
import * as HeroIconsSolid from '@heroicons/vue/24/solid'

// Material Symbol to Heroicon mapping
const iconMap: Record<string, FunctionalComponent<SVGAttributes>> = {
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
  undo: HeroIconsOutline.ArrowUturnLeftIcon,

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

  // Solid Variants
  thumb_up_solid: HeroIconsSolid.HandThumbUpIcon,
  scale_solid: HeroIconsSolid.ScaleIcon,
  warning_solid: HeroIconsSolid.ExclamationTriangleIcon,
  sparkles_solid: HeroIconsSolid.SparklesIcon,
}

interface Props {
  name: string
  size?: number | string
  ariaHidden?: boolean
  ariaLabel?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  ariaHidden: true
})

const sizeValue = computed(() => 
  typeof props.size === 'number' ? `${props.size}px` : props.size || '1em'
)

const IconComponent = computed(() => iconMap[props.name])

const iconStyle = computed(() => ({
  width: sizeValue.value,
  height: sizeValue.value,
  flexShrink: 0
}))
</script>

<template>
  <component
    v-if="IconComponent"
    :is="IconComponent"
    :style="iconStyle"
    :aria-hidden="ariaLabel || title ? false : ariaHidden"
    :aria-label="ariaLabel || title"
  />
  <svg
    v-else
    :style="iconStyle"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" stroke-dasharray="3 3" />
    <text x="12" y="16" text-anchor="middle" font-size="10" fill="currentColor">?</text>
  </svg>
</template>
