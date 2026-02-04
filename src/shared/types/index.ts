import { z } from 'zod'

export const RoleKeys = ['SW', '자막', '고정', '사이드', '스케치'] as const
export type RoleKey = typeof RoleKeys[number]

export type PartAssignment = {
	SW: string
	자막: string
	고정: string
	사이드: [string, string]
	스케치: string
}

export type Absence = { name: string; reason?: string }
export type WeekData = { part1: PartAssignment; part2: PartAssignment; absences: Absence[] }

/**
 * 멤버 정보 (정규화된 구조)
 * - name: 순수 이름 (기수 제외)
 * - generation: 기수 숫자 (필수 - 정렬/필터용)
 * - active: 활동 여부
 * - notes: 메모
 */
export type MembersEntry = {
	name: string
	generation: number
	active: boolean
	notes?: string
}

export type AppData = { weeks: Record<string, WeekData>; members: MembersEntry[] }
export type CurrentWeekTemplate = { current_week: { part1: PartAssignment; part2: PartAssignment } }

export type ActivityType = 'assignment' | 'absence' | 'finalize' | 'member' | 'system'
export type ActivityEntry = {
	id: string
	timestamp: string
	type: ActivityType
	title: string
	description?: string
	meta?: Record<string, unknown>
}

export type MotionPreference = 'allow' | 'system' | 'reduce'
export type ThemePreference = 'light' | 'dark' | 'system'

const NonEmptyString = z.string()
export const ZPartAssignment = z.object({
	SW: z.string(),
	자막: z.string(),
	고정: z.string(),
	사이드: z.tuple([z.string(), z.string()]),
	스케치: z.string()
})

export const ZWeekData = z.object({
	part1: ZPartAssignment,
	part2: ZPartAssignment,
	absences: z.array(z.object({ name: NonEmptyString, reason: z.string().optional() }))
})

export const ZMembersEntry = z.object({
	name: NonEmptyString,
	generation: z.number(),
	active: z.boolean(),
	notes: z.string().optional()
})

export const ZAppData = z.object({
	weeks: z.record(ZWeekData),
	members: z.array(ZMembersEntry)
})

export const ZCurrentWeekTemplate = z.object({
	current_week: z.object({
		part1: ZPartAssignment,
		part2: ZPartAssignment
	})
})

export type WarningLevel = 'info' | 'warn' | 'error'
export type RotationCandidate = { name: string; weeksSince: number }
export type Warning = {
	id: string
	level: WarningLevel
	message: string
	target?: { date?: string; part?: 'part1' | 'part2'; role?: RoleKey; name?: string }
	/** Structured data for rotation recommendations */
	rotationCandidates?: RotationCandidate[]
}
