import { ZAppData, ZCurrentWeekTemplate, type AppData, type CurrentWeekTemplate } from '../types'

type JsonRecord = Record<string, unknown>
type MutableParsedData = JsonRecord & { members?: unknown; weeks?: unknown }
type MutablePart = JsonRecord & { SW?: unknown; 자막?: unknown; 고정?: unknown; 사이드?: unknown; 스케치?: unknown }
type MutableWeek = JsonRecord & { part1?: unknown; part2?: unknown; absences?: unknown }

const emptyPart = () => ({ SW: '', 자막: '', 고정: '', 사이드: ['', ''] as [string, string], 스케치: '' })

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === 'object' && value !== null
}

function migrateMembersGradeToNotes(parsed: MutableParsedData): MutableParsedData {
	if (Array.isArray(parsed.members)) {
		parsed.members = parsed.members.map((memberRaw) => {
			if (!isRecord(memberRaw)) return memberRaw

			const member = { ...memberRaw }
			// grade가 있으면 notes로 변환 (기존 데이터 호환성)
			if ('grade' in member && !('notes' in member)) {
				const gradeValue = member.grade
				delete member.grade
				return { ...member, notes: gradeValue ? String(gradeValue) : undefined }
			}
			// notes가 없으면 undefined로 설정
			if (!('notes' in member)) {
				return { ...member, notes: undefined }
			}
			return member
		})
	}
	return parsed
}

// members가 문자열 배열이면 객체 배열로 정규화
function normalizeMembers(parsed: MutableParsedData): MutableParsedData {
	if (Array.isArray(parsed.members) && parsed.members.every((m) => typeof m === 'string')) {
		parsed.members = (parsed.members as string[]).map((name) => ({ name, active: true }))
	}
	return parsed
}

function migrateEmptyParts(parsed: MutableParsedData): MutableParsedData {
	if (!isRecord(parsed.weeks)) return parsed

	for (const weekRaw of Object.values(parsed.weeks)) {
		if (!isRecord(weekRaw)) continue
		const week = weekRaw as MutableWeek

		if (!isRecord(week.part1) || Object.keys(week.part1).length === 0) {
			week.part1 = emptyPart()
		}
		if (!isRecord(week.part2) || Object.keys(week.part2).length === 0) {
			week.part2 = emptyPart()
		}

		const defaultPart = emptyPart()
		week.part1 = { ...defaultPart, ...(isRecord(week.part1) ? week.part1 : {}) }
		week.part2 = { ...defaultPart, ...(isRecord(week.part2) ? week.part2 : {}) }

		const part1 = week.part1 as MutablePart
		const part2 = week.part2 as MutablePart
		if (!Array.isArray(part1['사이드']) || part1['사이드'].length !== 2) {
			part1['사이드'] = ['', '']
		}
		if (!Array.isArray(part2['사이드']) || part2['사이드'].length !== 2) {
			part2['사이드'] = ['', '']
		}

		// absences가 없으면 빈 배열로 설정
		if (!Array.isArray(week.absences)) {
			week.absences = []
		}
	}

	return parsed
}

// 이름 표준화: members의 이름을 기준으로 주차 데이터(part1/part2/absences)의 이름을 일치시킵니다.
function normalizeNames(parsed: MutableParsedData): MutableParsedData {
	const members = Array.isArray(parsed.members) ? parsed.members : []
	const canonicalNames = new Set<string>(
		members.map((member) => (isRecord(member) ? String(member.name) : ''))
	)

	// 예: "22 예찬" -> "예찬"
	const stripPrefix = (name: string) => name.replace(/^\s*\d{2}\s+/, '')

	// "예찬" -> "22 예찬" 같은 매핑을 우선 구성
	const aliasToCanonical = new Map<string, string>()
	for (const name of canonicalNames) {
		const base = stripPrefix(name)
		if (base && base !== name && !aliasToCanonical.has(base)) {
			aliasToCanonical.set(base, name)
		}
	}

	const toCanonical = (name: unknown): string => {
		if (!name || typeof name !== 'string') return ''
		// 1) 이미 정규 멤버명인 경우
		if (canonicalNames.has(name)) return name
		// 2) 접두 학번 제거 후 별칭 매핑
		const base = stripPrefix(name)
		const aliased = aliasToCanonical.get(base)
		if (aliased) return aliased
		// 3) 멤버가 접두어 없이만 등록된 경우 대비
		if (canonicalNames.has(base)) return base
		// 매칭 실패 시 원본 반환
		return name
	}

	if (isRecord(parsed.weeks)) {
		for (const weekRaw of Object.values(parsed.weeks)) {
			if (!isRecord(weekRaw)) continue
			const week = weekRaw as MutableWeek

			const fixPart = (partRaw: unknown) => {
				if (!isRecord(partRaw)) return
				const part = partRaw as MutablePart
				// 단일 필드
				if (typeof part.SW === 'string') part.SW = toCanonical(part.SW)
				if (typeof part['자막'] === 'string') part['자막'] = toCanonical(part['자막'])
				if (typeof part['고정'] === 'string') part['고정'] = toCanonical(part['고정'])
				if (typeof part['스케치'] === 'string') part['스케치'] = toCanonical(part['스케치'])
				// 사이드: 2인 배열
				if (Array.isArray(part['사이드'])) {
					part['사이드'] = part['사이드'].map((name) => toCanonical(name))
				}
			}

			fixPart(week.part1)
			fixPart(week.part2)

			if (Array.isArray(week.absences)) {
				week.absences = week.absences.map((absenceRaw) => {
					if (!isRecord(absenceRaw)) return { name: '' }
					return {
						...absenceRaw,
						name: toCanonical(absenceRaw.name)
					}
				})
			}
		}
	}

	return parsed
}

function isEmptyPart(part: unknown): boolean {
	if (!isRecord(part)) return true
	const isEmpty = (value: unknown) => !value || (typeof value === 'string' && value.trim() === '')

	if (!isEmpty(part.SW)) return false
	if (!isEmpty(part.자막)) return false
	if (!isEmpty(part.고정)) return false
	if (!isEmpty(part.스케치)) return false

	const side = part['사이드']
	if (Array.isArray(side)) {
		if (side.some((value) => !isEmpty(value))) return false
	} else if (!isEmpty(side)) {
		return false
	}

	return true
}

function removeEmptyWeeks(parsed: MutableParsedData): MutableParsedData {
	if (isRecord(parsed.weeks)) {
		const nextWeeks: Record<string, unknown> = {}
		for (const [date, weekRaw] of Object.entries(parsed.weeks)) {
			if (!isRecord(weekRaw)) continue
			const week = weekRaw as MutableWeek

			const part1Empty = isEmptyPart(week.part1)
			const part2Empty = isEmptyPart(week.part2)
			const absencesEmpty = !Array.isArray(week.absences) || week.absences.length === 0

			// 배정도 없고 불참자도 없으면 빈 주차로 간주하여 제거
			if (part1Empty && part2Empty && absencesEmpty) {
				continue
			}
			nextWeeks[date] = week
		}
		parsed.weeks = nextWeeks
	}
	return parsed
}

function parseAppData(jsonText: string): AppData {
	const raw = JSON.parse(jsonText)
	let migrated: MutableParsedData = isRecord(raw) ? { ...raw } : {}
	migrated = normalizeMembers(migrated)
	migrated = migrateMembersGradeToNotes(migrated)
	migrated = migrateEmptyParts(migrated)
	// 이름 표준화(멤버명과 주차 데이터의 이름을 일치시킴)
	migrated = normalizeNames(migrated)
	// 빈 주차 제거 (데이터 최적화)
	migrated = removeEmptyWeeks(migrated)

	// ensure members array exists
	if (!Array.isArray(migrated.members)) {
		migrated.members = []
	}
	// ensure active flag
	const membersRaw = migrated.members as unknown[]
	migrated.members = membersRaw.map((memberRaw: unknown) => {
		if (!isRecord(memberRaw)) {
			return { name: '', generation: 0, active: true }
		}
		return {
			...memberRaw,
			active: typeof memberRaw.active === 'boolean' ? memberRaw.active : true
		}
	})

	return ZAppData.parse(migrated)
}

export async function openJsonFile(): Promise<AppData | null> {
	try {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'application/json,.json'
		const file = await new Promise<File | null>((resolve) => {
			input.onchange = () => resolve(input.files?.[0] ?? null)
			input.click()
		})
		if (!file) return null
		const text = await file.text()
		return parseAppData(text)
	} catch (e) {
		console.error(e)
		return null
	}
}

function sanitizeFileName(name: string): string {
	return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
}

function ensureJsonExtension(name: string): string {
	return name.toLowerCase().endsWith('.json') ? name : `${name}.json`
}

export async function saveJsonFile(data: AppData, suggestedFileName?: string): Promise<boolean> {
	// 내보내기 포맷: members는 전체 객체로 저장 (active, notes 포함)
	// 저장 시에도 빈 주차 제거 (데이터 최적화)
	const optimizedData = removeEmptyWeeks({ ...data, weeks: { ...data.weeks } }) as AppData

	const toExport = {
		...optimizedData,
		members: data.members.map((m) => ({
			name: m.name,
			active: m.active !== false, // 기본값 true
			...(m.notes ? { notes: m.notes } : {})
		}))
	}
	const defaultFileName = 'position-helper-data.json'
	const normalized = suggestedFileName?.trim()
	const fileName = sanitizeFileName(ensureJsonExtension(normalized && normalized.length > 0 ? normalized : defaultFileName))
	try {
		const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = fileName
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
		return true
	} catch (e) {
		console.error(e)
		return false
	}
}

export function validateCurrentWeekTemplate(obj: unknown): CurrentWeekTemplate {
	return ZCurrentWeekTemplate.parse(obj)
}
