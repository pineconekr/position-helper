/**
 * text.ts
 * 문자열 처리 관련 유틸리티
 */

/**
 * HTML Special Characters를 이스케이프하여 XSS를 방지합니다.
 * Chart Tooltip 등에서 HTML 문자열을 직접 조립할 때 사용합니다.
 */
export function escapeHtml(text: string | number | null | undefined): string {
    if (text === null || text === undefined) return ''
    const str = String(text)
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}
