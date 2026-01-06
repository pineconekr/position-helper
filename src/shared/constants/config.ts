/**
 * 애플리케이션 설정 상수
 * 
 * 하드코딩된 매직 넘버들을 중앙화하여
 * 유지보수성과 일관성을 높임
 */

// ─────────────────────────────────────────────────────────────────────────────
// UI Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const UI_CONFIG = {
    /** 드래그 활성화 최소 거리 (px) */
    DRAG_ACTIVATION_DISTANCE: 8,

    /** 활동 피드 기본 최대 표시 개수 */
    ACTIVITY_MAX_ITEMS: 16,

    /** Undo 히스토리 최대 보관 개수 */
    MAX_UNDO_HISTORY: 20,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Toast/Feedback Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const TOAST_CONFIG = {
    /** 토스트 기본 지속 시간 (ms) */
    DEFAULT_DURATION_MS: 4200,

    /** 에러 토스트 지속 시간 (ms) */
    ERROR_DURATION_MS: 6000,
} as const

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
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Design Tokens (Icon, Typography, Animation)
// ─────────────────────────────────────────────────────────────────────────────

export const DESIGN_TOKENS = {
    /** 아이콘 사이즈 */
    ICON_SIZES: {
        XS: 12,
        SM: 14,
        MD: 16,
        LG: 18,
        XL: 20,
        XXL: 24,
        XXXL: 32,
    },

    /** 간격 (spacing) */
    SPACING: {
        XS: 4,
        SM: 8,
        MD: 12,
        LG: 16,
        XL: 24,
    },

    /** 애니메이션 Easing */
    EASING: {
        DEFAULT: 'ease-out',
        SPRING: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },

    /** 애니메이션 Duration (ms) */
    DURATION: {
        FAST: 100,
        NORMAL: 200,
        SLOW: 300,
        VERY_SLOW: 500,
    },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Color Classes (for CSS variable-based theming)
// These replace hard-coded dark: prefixes
// ─────────────────────────────────────────────────────────────────────────────

export const SEMANTIC_COLORS = {
    /** Status colors using CSS variables */
    STATUS: {
        SUCCESS: {
            bg: 'bg-[var(--color-success)]/10',
            text: 'text-[var(--color-success)]',
            border: 'border-[var(--color-success)]/20',
        },
        WARNING: {
            bg: 'bg-[var(--color-warning)]/10',
            text: 'text-[var(--color-warning)]',
            border: 'border-[var(--color-warning)]/20',
        },
        DANGER: {
            bg: 'bg-[var(--color-danger)]/10',
            text: 'text-[var(--color-danger)]',
            border: 'border-[var(--color-danger)]/20',
        },
        ACCENT: {
            bg: 'bg-[var(--color-accent)]/10',
            text: 'text-[var(--color-accent)]',
            border: 'border-[var(--color-accent)]/20',
        },
    },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type RoleName = typeof ROLE_CONFIG.ALL_ROLES[number]
export type RotationRole = typeof ROLE_CONFIG.ROTATION_ROLES[number]
export type IconSize = keyof typeof DESIGN_TOKENS.ICON_SIZES
