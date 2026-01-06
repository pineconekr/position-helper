/**
 * 통계 차트 공통 테마 상수
 * AssignmentDeviationChart의 프리미엄 스타일을 기반으로 정의
 */

// 역할별 색상 정의
export const ROLE_COLORS = {
    SW: { light: '#3b82f6', dark: '#60a5fa' },      // blue
    자막: { light: '#6366f1', dark: '#818cf8' },     // indigo
    고정: { light: '#10b981', dark: '#34d399' },     // emerald
    사이드: { light: '#f59e0b', dark: '#fbbf24' },   // amber
    스케치: { light: '#f43f5e', dark: '#fb7185' },   // rose
} as const

// 기수별 색상 정의
export const COHORT_COLORS: Record<number, { light: string; dark: string }> = {
    15: { light: '#8b5cf6', dark: '#a78bfa' }, // violet
    16: { light: '#06b6d4', dark: '#22d3ee' }, // cyan
    17: { light: '#10b981', dark: '#34d399' }, // emerald
    18: { light: '#f59e0b', dark: '#fbbf24' }, // amber
    19: { light: '#ef4444', dark: '#f87171' }, // red
    20: { light: '#ec4899', dark: '#f472b6' }, // pink
    21: { light: '#6366f1', dark: '#818cf8' }, // indigo
}

// 시맨틱 색상 정의
export const SEMANTIC_COLORS = {
    success: { light: '#10b981', dark: '#34d399' },
    warning: { light: '#f59e0b', dark: '#fbbf24' },
    danger: { light: '#ef4444', dark: '#f87171' },
    info: { light: '#3b82f6', dark: '#60a5fa' },
} as const

/**
 * 테마에 따른 차트 색상 객체 생성
 */
export function getChartThemeColors(isDark: boolean) {
    return {
        // 텍스트 색상
        textPrimary: isDark ? '#f8fafc' : '#0f172a',     // slate-50 / slate-900
        textSecondary: isDark ? '#94a3b8' : '#64748b',   // slate-400 / slate-500
        textMuted: isDark ? '#64748b' : '#94a3b8',       // slate-500 / slate-400
        textSubtle: isDark ? '#475569' : '#cbd5e1',      // slate-600 / slate-300

        // 배경 및 표면 색상
        surface: isDark ? '#1e293b' : '#ffffff',          // slate-800 / white
        surfaceElevated: isDark ? '#334155' : '#f8fafc',  // slate-700 / slate-50
        canvas: isDark ? '#0f172a' : '#ffffff',           // slate-900 / white

        // 테두리 색상
        border: isDark ? '#334155' : '#e2e8f0',                      // slate-700 / slate-200
        borderSubtle: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)',

        // 툴팁
        tooltipBg: isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        tooltipShadow: isDark
            ? '0 12px 40px rgba(0,0,0,0.4)'
            : '0 12px 40px rgba(0,0,0,0.15)',

        // 그리드 라인
        gridLine: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)',

        // 강조 색상
        accent: isDark ? '#60a5fa' : '#3b82f6',           // blue-400 / blue-500
        accentMuted: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.15)',

        // 시맨틱 색상
        success: isDark ? '#34d399' : '#10b981',
        warning: isDark ? '#fbbf24' : '#f59e0b',
        danger: isDark ? '#f87171' : '#ef4444',
        info: isDark ? '#60a5fa' : '#3b82f6',

        // 영역 배경 (차트 내부 영역용)
        positiveZone: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)',
        negativeZone: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
        balancedZone: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',

        // 셀/아이템 배경
        cellEmpty: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(241, 245, 249, 0.8)',
        cellBorder: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)',

        // 레이더 차트 전용
        radarAxis: isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(203, 213, 225, 0.6)',
        radarSplit: isDark ? 'rgba(71, 85, 105, 0.25)' : 'rgba(203, 213, 225, 0.4)',
        radarFill: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.25)',
    }
}

/**
 * 역할 색상 가져오기
 */
export function getRoleColor(role: string, isDark: boolean): string {
    const roleKey = role as keyof typeof ROLE_COLORS
    const colors = ROLE_COLORS[roleKey]
    if (!colors) return isDark ? '#94a3b8' : '#64748b'
    return isDark ? colors.dark : colors.light
}

/**
 * 기수 색상 가져오기
 */
export function getCohortColor(cohort: number | null, isDark: boolean): string {
    if (cohort === null) return isDark ? '#64748b' : '#94a3b8'
    const colors = COHORT_COLORS[cohort]
    if (!colors) return isDark ? '#94a3b8' : '#64748b'
    return isDark ? colors.dark : colors.light
}

/**
 * 점수에 따른 색상 가져오기
 */
export function getScoreColor(score: number, isDark: boolean): string {
    if (score >= 80) return isDark ? '#34d399' : '#10b981' // excellent - emerald
    if (score >= 60) return isDark ? '#60a5fa' : '#3b82f6' // good - blue
    if (score >= 40) return isDark ? '#fbbf24' : '#f59e0b' // fair - amber
    return isDark ? '#f87171' : '#ef4444' // poor - red
}

/**
 * 툴팁 공통 스타일 객체 생성
 */
export function getTooltipStyle(themeColors: ReturnType<typeof getChartThemeColors>) {
    return {
        backgroundColor: themeColors.tooltipBg,
        borderColor: themeColors.border,
        borderWidth: 1,
        padding: [14, 18],
        textStyle: {
            color: themeColors.textPrimary,
            fontSize: 13
        },
        extraCssText: `box-shadow: ${themeColors.tooltipShadow}; border-radius: 12px; backdrop-filter: blur(12px);`
    }
}

/**
 * 축(Axis) 공통 스타일
 */
export function getAxisStyle(themeColors: ReturnType<typeof getChartThemeColors>) {
    return {
        axisLine: {
            show: false
        },
        axisTick: {
            show: false
        },
        axisLabel: {
            color: themeColors.textSecondary,
            fontSize: 11,
            fontWeight: 500
        },
        splitLine: {
            lineStyle: {
                color: themeColors.gridLine,
                type: 'dashed' as const
            }
        }
    }
}
