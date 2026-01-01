import { ZAppData, ZCurrentWeekTemplate, type AppData, type CurrentWeekTemplate } from '../types'


const emptyPart = () => ({ SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' })

function migrateMembersGradeToNotes(parsed: any): any {
	if (parsed?.members && Array.isArray(parsed.members)) {
		parsed.members = parsed.members.map((m: any) => {
			// grade가 있으면 notes로 변환 (기존 데이터 호환성)
			if ('grade' in m && !('notes' in m)) {
				const gradeValue = m.grade
				const { grade, ...rest } = m
				return { ...rest, notes: gradeValue ? String(gradeValue) : undefined }
			}
			// notes가 없으면 undefined로 설정
			if (!('notes' in m)) {
				return { ...m, notes: undefined }
			}
			return m
		})
	}
	return parsed
}

// members가 문자열 배열이면 객체 배열로 정규화
function normalizeMembers(parsed: any): any {
	if (parsed?.members && Array.isArray(parsed.members)) {
		if (parsed.members.every((m: any) => typeof m === 'string')) {
			parsed.members = (parsed.members as string[]).map((name) => ({ name, active: true }))
		}
	}
	return parsed
}

function migrateEmptyParts(parsed: any): any {
	if (parsed?.weeks && typeof parsed.weeks === 'object') {
		for (const [, weekRaw] of Object.entries(parsed.weeks as any)) {
			const week = weekRaw as any
			if (!week || typeof week !== 'object') continue
			if (!week.part1 || Object.keys(week.part1).length === 0) {
				week.part1 = emptyPart()
			}
			if (!week.part2 || Object.keys(week.part2).length === 0) {
				week.part2 = emptyPart()
			}
			// part1, part2의 필드가 누락된 경우 기본값으로 채우기
			const defaultPart = emptyPart()
			week.part1 = { ...defaultPart, ...week.part1 }
			week.part2 = { ...defaultPart, ...week.part2 }
			// 사이드가 배열이 아니거나 길이가 2가 아니면 기본값으로 설정
			if (!Array.isArray(week.part1.사이드) || week.part1.사이드.length !== 2) {
				week.part1.사이드 = ['', '']
			}
			if (!Array.isArray(week.part2.사이드) || week.part2.사이드.length !== 2) {
				week.part2.사이드 = ['', '']
			}
			// absences가 없으면 빈 배열로 설정
			if (!Array.isArray(week.absences)) {
				week.absences = []
			}
		}
	}
	return parsed
}

// 이름 표준화: members의 이름을 기준으로 주차 데이터(part1/part2/absences)의 이름을 일치시킵니다.
function normalizeNames(parsed: any): any {
	if (!parsed || typeof parsed !== 'object') return parsed
	const members: any[] = Array.isArray(parsed.members) ? parsed.members : []
	const canonicalNames = new Set<string>(members.map((m: any) => String(m.name)))

	// 예: "22 예찬" -> "예찬"
	const stripPrefix = (name: string) => name.replace(/^\s*\d{2}\s+/, '')

	// "예찬" -> "22 예찬" 같은 매핑을 우선 구성
	const aliasToCanonical = new Map<string, string>()
	for (const n of canonicalNames) {
		const base = stripPrefix(n)
		if (base && base !== n && !aliasToCanonical.has(base)) {
			aliasToCanonical.set(base, n)
		}
	}

	const toCanonical = (name: any): string => {
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

	if (parsed.weeks && typeof parsed.weeks === 'object') {
		for (const [, weekRaw] of Object.entries(parsed.weeks as any)) {
			const week = weekRaw as any
			if (!week || typeof week !== 'object') continue

			const fixPart = (part: any) => {
				if (!part || typeof part !== 'object') return
				// 단일 필드
				if (typeof part.SW === 'string') part.SW = toCanonical(part.SW)
				if (typeof part['자막'] === 'string') part['자막'] = toCanonical(part['자막'])
				if (typeof part['고정'] === 'string') part['고정'] = toCanonical(part['고정'])
				if (typeof part['스케치'] === 'string') part['스케치'] = toCanonical(part['스케치'])
				// 사이드: 2인 배열
				if (Array.isArray(part['사이드'])) {
					part['사이드'] = part['사이드'].map((n: any) => toCanonical(n))
				}
			}

			fixPart(week.part1)
			fixPart(week.part2)

			if (Array.isArray(week.absences)) {
				week.absences = week.absences.map((a: any) => ({
					...a,
					name: toCanonical(a?.name)
				}))
			}
		}
	}

	return parsed
}

function isEmptyPart(part: any): boolean {
	if (!part) return true
	const isEmpty = (v: any) => !v || (typeof v === 'string' && v.trim() === '')

	if (!isEmpty(part.SW)) return false
	if (!isEmpty(part.자막)) return false
	if (!isEmpty(part.고정)) return false
	if (!isEmpty(part.스케치)) return false

	if (Array.isArray(part['사이드'])) {
		if (part['사이드'].some((v: any) => !isEmpty(v))) return false
	} else if (!isEmpty(part['사이드'])) {
		return false
	}

	return true
}

function removeEmptyWeeks(parsed: any): any {
	if (parsed?.weeks && typeof parsed.weeks === 'object') {
		const nextWeeks: Record<string, any> = {}
		for (const [date, week] of Object.entries(parsed.weeks as any)) {
			const w = week as any
			if (!w) continue

			const part1Empty = isEmptyPart(w.part1)
			const part2Empty = isEmptyPart(w.part2)
			const absencesEmpty = !Array.isArray(w.absences) || w.absences.length === 0

			// 배정도 없고 불참자도 없으면 빈 주차로 간주하여 제거
			if (part1Empty && part2Empty && absencesEmpty) {
				continue
			}
			nextWeeks[date] = w
		}
		parsed.weeks = nextWeeks
	}
	return parsed
}

function parseAppData(jsonText: string): AppData {
	const parsed = JSON.parse(jsonText)
	let migrated = normalizeMembers(parsed)
	migrated = migrateMembersGradeToNotes(migrated)
	migrated = migrateEmptyParts(migrated)
	// 이름 표준화(멤버명과 주차 데이터의 이름을 일치시킴)
	migrated = normalizeNames(migrated)
	// 빈 주차 제거 (데이터 최적화)
	migrated = removeEmptyWeeks(migrated)

	// ensure members array exists
	if (!migrated.members || !Array.isArray(migrated.members)) {
		migrated.members = []
	}
	// ensure active flag
	if (migrated?.members && Array.isArray(migrated.members)) {
		migrated.members = migrated.members.map((m: any) => ({
			...m,
			active: typeof m.active === 'boolean' ? m.active : true
		}))
	}
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
	const optimizedData = removeEmptyWeeks({ ...data, weeks: { ...data.weeks } })

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


