import { useAppStore } from '@/shared/state/store'

export default function ThemeToggle() {
	const theme = useAppStore((s) => s.theme)
	const setTheme = useAppStore((s) => s.setTheme)

	// 시스템 모드인 경우 라이트 모드로 변환
	const currentTheme = theme === 'system' ? 'light' : theme

	function cycleTheme() {
		if (currentTheme === 'light') {
			setTheme('dark')
		} else {
			setTheme('light')
		}
	}

	const iconMap: Record<'light' | 'dark', string> = {
		light: 'light_mode',
		dark: 'dark_mode'
	}
	const labelMap: Record<'light' | 'dark', string> = {
		light: '라이트 모드',
		dark: '다크 모드'
	}

	const nextTheme = currentTheme === 'light' ? 'dark' : 'light'
	const nextLabel = nextTheme === 'light' ? '라이트 모드로 전환' : '다크 모드로 전환'

	return (
		<button
			className="inline-flex items-center justify-center px-2.5 ml-auto cursor-pointer
				text-[var(--color-text-primary)] bg-transparent border-none
				hover:opacity-80 transition-opacity duration-150"
			onClick={cycleTheme}
			aria-label={`현재 ${labelMap[currentTheme]}. ${nextLabel}`}
			title={`${labelMap[currentTheme]} · ${nextLabel}`}
		>
			<span className="material-symbol text-xl" aria-hidden="true">
				{iconMap[currentTheme]}
			</span>
		</button>
	)
}
