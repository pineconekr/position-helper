import type { RoleKey } from '@/shared/types'
import { RoleKeys } from '@/shared/types'

type PartKey = 'part1' | 'part2'
type IndexToken = '0' | '1' | 'single'

export type DropTarget = { part: PartKey; role: RoleKey; index?: 0 | 1 }
export type AssignedSource = { part: PartKey; role: RoleKey; index?: 0 | 1; name: string }

const roleSet: ReadonlySet<string> = new Set(RoleKeys)

function parsePart(value: string): PartKey | null {
	if (value === 'part1' || value === 'part2') return value
	return null
}

function parseRole(value: string): RoleKey | null {
	if (roleSet.has(value)) return value as RoleKey
	return null
}

function parseIndexToken(token: string): 0 | 1 | undefined | null {
	const t = token as IndexToken
	if (t === 'single') return undefined
	if (t === '0') return 0
	if (t === '1') return 1
	return null
}

export function encodeDropId(target: DropTarget): string {
	return `drop:${target.part}:${target.role}:${target.index ?? 'single'}`
}

export function decodeDropId(id: string): DropTarget | null {
	if (!id.startsWith('drop:')) return null
	const [, rawPart, rawRole, rawIndex] = id.split(':')
	const part = rawPart ? parsePart(rawPart) : null
	const role = rawRole ? parseRole(rawRole) : null
	if (!part || !role) return null

	const idx = parseIndexToken(rawIndex ?? 'single')
	if (idx === null) return null
	if (role === '사이드' && (idx !== 0 && idx !== 1)) return null
	if (role !== '사이드' && idx !== undefined) return null
	return { part, role, index: idx }
}

export function encodeAssignedId(source: Omit<AssignedSource, 'name'>, name: string): string {
	return `assigned:${source.part}:${source.role}:${source.index ?? 'single'}:${name}`
}

export function decodeAssignedId(id: string): AssignedSource | null {
	if (!id.startsWith('assigned:')) return null
	// name에 ':'가 들어가도 복원 가능하도록 나머지를 join
	const parts = id.split(':')
	if (parts.length < 5) return null
	const rawPart = parts[1] ?? ''
	const rawRole = parts[2] ?? ''
	const rawIndex = parts[3] ?? 'single'
	const name = parts.slice(4).join(':')

	const part = parsePart(rawPart)
	const role = parseRole(rawRole)
	if (!part || !role) return null

	const idx = parseIndexToken(rawIndex)
	if (idx === null) return null
	if (role === '사이드' && (idx !== 0 && idx !== 1)) return null
	if (role !== '사이드' && idx !== undefined) return null

	return { part, role, index: idx, name }
}

export function encodeMemberId(name: string): string {
	return `member:${name}`
}

export function decodeMemberId(id: string): string | null {
	if (!id.startsWith('member:')) return null
	return id.slice('member:'.length)
}

