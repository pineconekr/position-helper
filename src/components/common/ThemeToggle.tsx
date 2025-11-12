import { useAppStore } from '../../state/store'

export default function ThemeToggle() {
	const theme = useAppStore((s) => s.theme)
	const setTheme = useAppStore((s) => s.setTheme)
	const effectiveTheme = useAppStore((s) => s.getEffectiveTheme())

	function cycleTheme() {
		if (theme === 'system') setTheme('light')
		else if (theme === 'light') setTheme('dark')
		else setTheme('system')
	}

	const emojiMap: Record<typeof theme, string> = {
		system: '🖥️',
		light: '🌞',
		dark: '🌙'
	}
	const labelMap: Record<typeof theme, string> = {
		system: `시스템 (${effectiveTheme === 'dark' ? '다크' : '라이트'} 적용)`,
		light: '라이트 모드',
		dark: '다크 모드'
	}

	const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
	const nextLabelMap: Record<typeof theme, string> = {
		system: '라이트 모드로 전환',
		light: '다크 모드로 전환',
		dark: '시스템 모드로 전환'
	}

	return (
		<button
			className="btn theme-toggle"
			onClick={cycleTheme}
			aria-label={`현재 ${labelMap[theme]}. ${nextLabelMap[theme]}`}
			title={`${labelMap[theme]} · ${nextLabelMap[theme]}`}
		>
			<span className="theme-toggle__emoji" aria-hidden="true">
				{emojiMap[theme]}
			</span>
			<span className="theme-toggle__text">{labelMap[theme]}</span>
		</button>
	)
}

