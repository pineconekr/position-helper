/**
 * 🚢 Member Registry - Mothership for Generation Management
 * 
 * 이 파일은 기수(generation) 관련 로직의 SINGLE SOURCE OF TRUTH입니다.
 * 프로젝트 전체에서 기수 정보가 필요할 때 이 유틸리티를 사용하세요.
 */

import type { MembersEntry } from '../types'

/**
 * 레거시 이름 형식 (예: "20 박예")에서 기수와 순수 이름을 추출합니다.
 */
const LEGACY_NAME_PATTERN = /^(\d+)\s+(.+)$/

export interface ParsedMember {
    /** 순수 이름 (예: "박예") */
    displayName: string
    /** 기수 숫자 (예: 20) */
    generation: number | null
}

type LegacyMemberRecord = Partial<MembersEntry> & Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

/**
 * 레거시 이름 형식 ("20 박예")을 파싱합니다.
 * 새 형식의 데이터는 이 함수 호출이 필요 없습니다.
 */
export function parseLegacyName(rawName: string): ParsedMember {
    const match = rawName.match(LEGACY_NAME_PATTERN)

    if (match) {
        return {
            displayName: match[2],
            generation: parseInt(match[1], 10)
        }
    }

    return {
        displayName: rawName,
        generation: null
    }
}

/**
 * 멤버의 기수를 가져옵니다.
 * 우선순위: member.generation 필드 > 레거시 이름 파싱
 */
export function getMemberGeneration(member: MembersEntry): number | null {
    // 1. 명시적 generation 필드가 있으면 우선 사용
    if (typeof member.generation === 'number') {
        return member.generation
    }

    // 2. 레거시 지원: 이름에서 파싱
    return parseLegacyName(member.name).generation
}

/**
 * 멤버의 표시용 이름 (기수 제외)
 * 새 형식에서는 name 자체가 순수 이름이므로 그대로 반환
 * 레거시 형식("20 박예")에서는 기수를 제거하고 반환
 */
export function getDisplayName(member: MembersEntry): string {
    // 이미 generation 필드가 있으면 name은 순수 이름으로 간주
    if (typeof member.generation === 'number') {
        return member.name
    }

    // 레거시 지원: 이름에서 기수 제거
    return parseLegacyName(member.name).displayName
}

/**
 * 기수 라벨 (예: "20기")
 */
export function getGenerationLabel(member: MembersEntry): string | null {
    const gen = getMemberGeneration(member)
    return gen ? `${gen}기` : null
}

/**
 * 레거시 데이터를 새 형식으로 마이그레이션합니다.
 * "20 박예" -> { name: "박예", generation: 20 }
 */
export function migrateMember(legacyMember: unknown): MembersEntry {
    const member: LegacyMemberRecord = isRecord(legacyMember) ? legacyMember : {}

    // 이미 새 형식이면 정규화해서 반환
    if (
        typeof member.generation === 'number' &&
        typeof member.name === 'string' &&
        typeof member.active === 'boolean'
    ) {
        return {
            name: member.name,
            generation: member.generation,
            active: member.active,
            ...(typeof member.notes === 'string' ? { notes: member.notes } : {})
        }
    }

    const rawName = typeof member.name === 'string' ? member.name : ''
    const parsed = parseLegacyName(rawName)

    return {
        name: parsed.displayName,
        generation: parsed.generation ?? 0, // 기수 없으면 0 (정렬용)
        active: typeof member.active === 'boolean' ? member.active : true,
        notes: typeof member.notes === 'string' ? member.notes : ''
    }
}

/**
 * 전체 멤버 배열을 마이그레이션합니다.
 */
export function migrateMembers(legacyMembers: unknown[]): MembersEntry[] {
    return legacyMembers.map(migrateMember)
}

/**
 * 기수별 멤버 그룹화
 */
export function groupByGeneration(members: MembersEntry[]): Map<number, MembersEntry[]> {
    const map = new Map<number, MembersEntry[]>()

    members.forEach(m => {
        const gen = getMemberGeneration(m)
        if (gen) {
            if (!map.has(gen)) map.set(gen, [])
            map.get(gen)!.push(m)
        }
    })

    return map
}

/**
 * 기수 목록 (유니크, 오름차순)
 */
export function getGenerationList(members: MembersEntry[]): number[] {
    const gens = new Set<number>()
    members.forEach(m => {
        const gen = getMemberGeneration(m)
        if (gen) gens.add(gen)
    })
    return Array.from(gens).sort((a, b) => a - b)
}
