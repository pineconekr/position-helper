export type ChartUiPalette = {
  text: string
  textStrong: string
  border: string
  grid: string
  surface: string
}

export type ChartSeriesPalette = {
  primary: string
  secondary: string
  info: string
  success: string
  warning: string
  danger: string
  accent: string
  roleSw: string
  roleCaption: string
  roleFixed: string
  roleSide: string
  roleSketch: string
}

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function getChartUiPalette(): ChartUiPalette {
  return {
    text: readCssVar('--color-label-tertiary', '#64748b'),
    textStrong: readCssVar('--color-label-primary', '#0f172a'),
    border: readCssVar('--color-border-default', '#d5dce7'),
    grid: readCssVar('--color-border-subtle', '#e1e8f2'),
    surface: readCssVar('--color-surface', '#ffffff'),
  }
}

export function getChartSeriesPalette(): ChartSeriesPalette {
  return {
    primary: readCssVar('--color-accent', '#2563eb'),
    secondary: readCssVar('--chart-5', '#4f46e5'),
    info: readCssVar('--color-info', '#0f4c81'),
    success: readCssVar('--color-success', '#047857'),
    warning: readCssVar('--color-warning', '#b45309'),
    danger: readCssVar('--color-danger', '#dc2626'),
    accent: readCssVar('--color-accent', '#2563eb'),
    roleSw: readCssVar('--color-role-sw', '#1d4ed8'),
    roleCaption: readCssVar('--color-role-caption', '#0f766e'),
    roleFixed: readCssVar('--color-role-fixed', '#4f46e5'),
    roleSide: readCssVar('--color-role-side', '#b45309'),
    roleSketch: readCssVar('--color-role-sketch', '#be185d'),
  }
}

export function withAlpha(color: string, alpha: number): string {
  const trimmed = color.trim()
  const safeAlpha = Math.max(0, Math.min(1, alpha))

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    const full = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16)
      const g = parseInt(full.slice(2, 4), 16)
      const b = parseInt(full.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`
    }
  }

  if (trimmed.startsWith('rgb(')) {
    return trimmed.replace('rgb(', 'rgba(').replace(')', `, ${safeAlpha})`)
  }

  return trimmed
}
