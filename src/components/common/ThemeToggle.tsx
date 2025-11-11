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
	
	const emoji = effectiveTheme === 'dark' ? '🌙' : '🌞'
	
	return (
		<button className="btn" onClick={cycleTheme} title={`테마: ${theme === 'system' ? '시스템' : theme === 'light' ? '라이트' : '다크'}`}>
			{emoji}
		</button>
	)
}


