import { useReducedMotion } from 'framer-motion'
import { useAppStore } from '../state/store'

export const motionDur = {
	quick: 0.16,
	medium: 0.22,
	slow: 0.36,
	page: 0.54
} as const

export const motionDurMs = {
	quick: 160,
	medium: 220,
	slow: 360,
	page: 540,
	chart: 220
} as const

export const motionEase = {
	inOut: 'easeInOut',
	out: 'easeOut',
	in: 'easeIn'
} as const

export type MotionDurationKey = keyof typeof motionDur
export type MotionDurationMsKey = keyof typeof motionDurMs

export function resolveDuration(duration: number, prefersReducedMotion: boolean): number {
	return prefersReducedMotion ? 0 : duration
}

export function resolveDurationMs(duration: number, prefersReducedMotion: boolean): number {
	return prefersReducedMotion ? 0 : duration
}

export function useShouldReduceMotion(): boolean {
	const motionPreference = useAppStore((s) => s.motionPreference)
	const systemPreference = useReducedMotion() ?? false

	if (motionPreference === 'reduce') return true
	if (motionPreference === 'allow') return false
	return systemPreference
}


