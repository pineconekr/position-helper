import { useAppStore } from '@/shared/state/store'
import { useEffect, useState } from 'react'

// Source of truth matching src/theme/theme.css
const rawDurations = {
	fast: 0.15,
	normal: 0.25,
	slow: 0.4,
} as const

export const motionDur = {
	fast: rawDurations.fast,
	normal: rawDurations.normal,
	slow: rawDurations.slow,
	// Legacy aliases
	quick: rawDurations.fast,
	medium: rawDurations.normal,
	page: 0.54 // Keep for now until page transition refactor
} as const

export const motionDurMs = {
	fast: rawDurations.fast * 1000,
	normal: rawDurations.normal * 1000,
	slow: rawDurations.slow * 1000,
	// Legacy aliases
	quick: rawDurations.fast * 1000,
	medium: rawDurations.normal * 1000,
	page: 540,
	chart: 220
} as const

export const motionEase = {
	default: [0.4, 0, 0.2, 1], // cubic-bezier(0.4, 0, 0.2, 1)
	in: [0.4, 0, 1, 1],        // cubic-bezier(0.4, 0, 1, 1)
	out: [0, 0, 0.2, 1],       // cubic-bezier(0, 0, 0.2, 1)
	// Legacy aliases (string for CSS/Framer compatibility where needed)
	inOut: 'easeInOut',
	standard: 'cubic-bezier(0.4, 0, 0.2, 1)'
} as const

export type MotionDurationKey = keyof typeof motionDur
export type MotionDurationMsKey = keyof typeof motionDurMs

export function resolveDuration(duration: number, prefersReducedMotion: boolean): number {
	return prefersReducedMotion ? 0 : duration
}

export function resolveDurationMs(duration: number, prefersReducedMotion: boolean): number {
	return prefersReducedMotion ? 0 : duration
}

/**
 * 시스템의 prefers-reduced-motion 설정을 직접 감지하는 훅
 * (useReducedMotion은 MotionConfig와 독립적으로 동작하므로 직접 구현)
 */
function useSystemReducedMotion(): boolean {
	const [prefersReduced, setPrefersReduced] = useState(false)

	useEffect(() => {
		if (typeof window === 'undefined') return

		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
		setPrefersReduced(mediaQuery.matches)

		const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
		mediaQuery.addEventListener('change', handler)
		return () => mediaQuery.removeEventListener('change', handler)
	}, [])

	return prefersReduced
}

export function useShouldReduceMotion(): boolean {
	const motionPreference = useAppStore((s) => s.motionPreference)
	const systemPreference = useSystemReducedMotion()

	// 앱 설정 우선
	if (motionPreference === 'reduce') return true
	if (motionPreference === 'allow') return false
	// 'system'인 경우에만 시스템 설정 따름
	return systemPreference
}

/**
 * Returns motion configuration with reduced motion handling applied.
 * Useful for Framer Motion `variants` or `transition` props.
 */
export function useMotionConfig() {
	const shouldReduce = useShouldReduceMotion()

	const getDuration = (sec: number) => shouldReduce ? 0 : sec

	return {
		duration: {
			fast: getDuration(motionDur.fast),
			normal: getDuration(motionDur.normal),
			slow: getDuration(motionDur.slow),
			page: getDuration(motionDur.page),
		},
		ease: {
			default: motionEase.default,
			in: motionEase.in,
			out: motionEase.out,
		},
		shouldReduce
	}
}
