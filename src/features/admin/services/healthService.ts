import type { AppData } from '@/shared/types'

export interface HealthIssue {
    id: string
    type: 'error' | 'warning'
    category: 'orphan' | 'format' | 'logic'
    message: string
    details?: string
    fixable: boolean
}

export interface HealthReport {
    score: number // 0-100
    issues: HealthIssue[]
    timestamp: number
}

/**
 * Scan data for integrity issues
 */
export function scanData(data: AppData): HealthReport {
    const issues: HealthIssue[] = []
    const memberNames = new Set(data.members.map(m => m.name))

    // 1. Check Weeks for Orphaned Assignments
    Object.entries(data.weeks).forEach(([date, weekData]) => {
        // Collect all names in this week
        const assignedNames: string[] = []

        const scanPart = (p: any) => {
            if (p.SW) assignedNames.push(p.SW)
            if (p['자막']) assignedNames.push(p['자막'])
            if (p['고정']) assignedNames.push(p['고정'])
            if (p['스케치']) assignedNames.push(p['스케치'])
            if (Array.isArray(p['사이드'])) p['사이드'].forEach((n: string) => n && assignedNames.push(n))
        }

        scanPart(weekData.part1)
        scanPart(weekData.part2)

        assignedNames.forEach(name => {
            if (!memberNames.has(name) && name.trim() !== '') {
                issues.push({
                    id: `orphan-${date}-${name}`,
                    type: 'error',
                    category: 'orphan',
                    message: `존재하지 않는 멤버('${name}')가 배정됨`,
                    details: `${date} 주차에 삭제된 멤버가 배정되어 있습니다.`,
                    fixable: true
                })
            }
        })
    })

    // 2. Check Date Format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    Object.keys(data.weeks).forEach(date => {
        if (!dateRegex.test(date)) {
            issues.push({
                id: `format-${date}`,
                type: 'error',
                category: 'format',
                message: `잘못된 날짜 형식: ${date}`,
                details: 'YYYY-MM-DD 형식이 아니어서 시스템 오류를 유발할 수 있습니다.',
                fixable: false // Manual fix required
            })
        }
    })

    // Score Calculation
    let score = 100
    issues.forEach(i => score -= (i.type === 'error' ? 10 : 5))
    if (score < 0) score = 0

    return {
        score,
        issues,
        timestamp: Date.now()
    }
}

/**
 * Fix orphaned records by clearing them
 */
export function fixOrphans(data: AppData): AppData {
    const memberNames = new Set(data.members.map(m => m.name))
    const newData = JSON.parse(JSON.stringify(data)) as AppData

    Object.keys(newData.weeks).forEach(date => {
        const week = newData.weeks[date]
        const cleanPart = (p: any) => {
            if (p.SW && !memberNames.has(p.SW)) p.SW = ''
            if (p['자막'] && !memberNames.has(p['자막'])) p['자막'] = ''
            if (p['고정'] && !memberNames.has(p['고정'])) p['고정'] = ''
            if (p['스케치'] && !memberNames.has(p['스케치'])) p['스케치'] = ''
            if (Array.isArray(p['사이드'])) {
                p['사이드'] = p['사이드'].map((n: string) => (!memberNames.has(n) ? '' : n))
            }
        }
        cleanPart(week.part1)
        cleanPart(week.part2)
    })

    return newData
}
