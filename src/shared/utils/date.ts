export function formatDateISO(date: Date): string {
	const y = date.getFullYear()
	const m = `${date.getMonth() + 1}`.padStart(2, '0')
	const d = `${date.getDate()}`.padStart(2, '0')
	return `${y}-${m}-${d}`
}

export function isSunday(date: Date): boolean {
	return date.getDay() === 0
}

/**
 * 날짜를 한국어 형식으로 포맷 (예: "1월 31일 금요일")
 * @param dateStr - ISO 형식 날짜 문자열 (YYYY-MM-DD)
 * @returns 한국어 형식 날짜 문자열
 */
export function formatKoreanDate(dateStr: string): string {
	const date = new Date(dateStr)
	const month = date.getMonth() + 1
	const day = date.getDate()
	const weekdays = ['일', '월', '화', '수', '목', '금', '토']
	const weekday = weekdays[date.getDay()]
	return `${month}월 ${day}일 ${weekday}요일`
}
