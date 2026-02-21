/**
 * 애플리케이션 설정 상수
 * 
 * 하드코딩된 매직 넘버들을 중앙화하여
 * 유지보수성과 일관성을 높임
 */

// ─────────────────────────────────────────────────────────────────────────────
// Business Rules Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const RULES_CONFIG = {
    /** 연속 배정 체크 주수 */
    CONTINUOUS_CHECK_WEEKS: 3,

    /** 로테이션 권장 기간 (일) */
    ROTATION_WINDOW_DAYS: 14,

    /** 경고 레벨별 우선순위 */
    WARNING_LEVEL_PRIORITY: {
        error: 0,
        warn: 1,
        info: 2,
    },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Role Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const ROLE_CONFIG = {
    /** 역할별 필요 인원 수 */
    ROLE_COUNTS: {
        SW: 1,
        자막: 1,
        고정: 1,
        사이드: 2,
        스케치: 1,
    },

    /** 로테이션 대상 역할 */
    ROTATION_ROLES: ['SW', '자막', '고정', '스케치', '사이드'] as const,

    /** 모든 역할 목록 */
    ALL_ROLES: ['SW', '자막', '고정', '사이드', '스케치'] as const,

    /** 주당 총 슬롯 수 (part1 + part2) */
    TOTAL_SLOTS_PER_WEEK: 12,  // (SW:1 + 자막:1 + 고정:1 + 사이드:2 + 스케치:1) * 2
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Stats & Analytics Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const STATS_CONFIG = {
    /** 배정 변동계수(CV) 균형 기준선 */
    FAIRNESS_CV_BALANCE_THRESHOLD: 0.5,

    /** 개인 불참 편차(IQR 정규화) 상태 분류 기준 */
    ABSENCE_DEVIATION_STATUS_THRESHOLD: 0.5,
} as const
