import { useAppStore } from '../state/store'

export default function Settings() {
	const theme = useAppStore((s) => s.theme)
	const setTheme = useAppStore((s) => s.setTheme)
	const effectiveTheme = useAppStore((s) => s.getEffectiveTheme())

	const themeOptions = [
		{
			value: 'system' as const,
			icon: '🖥️',
			title: '시스템 모드',
			description: `운영체제 설정에 맞춰 자동으로 ${effectiveTheme === 'dark' ? '다크' : '라이트'} 모드가 적용됩니다.`
		},
		{
			value: 'light' as const,
			icon: '🌞',
			title: '라이트 모드',
			description: '밝고 선명한 화면 구성으로 실내 환경에서 또렷하게 확인하세요.'
		},
		{
			value: 'dark' as const,
			icon: '🌙',
			title: '다크 모드',
			description: '눈부심을 줄여 야간에도 편안하게 사용할 수 있습니다.'
		}
	]

	return (
		<div className="panel settings-panel">
			<div className="settings-section">
				<h3 className="settings-section__title">테마</h3>
				<p className="settings-section__description">
					상단 내비게이션의 이모지 버튼으로도 빠르게 전환할 수 있습니다.
				</p>
				<div className="settings-theme-grid">
					{themeOptions.map((option) => {
						const isActive = theme === option.value
						return (
							<button
								key={option.value}
								type="button"
								className={`settings-theme-option${isActive ? ' active' : ''}`}
								onClick={() => setTheme(option.value)}
								aria-pressed={isActive}
							>
								<span className="settings-theme-option__icon" aria-hidden="true">
									{option.icon}
								</span>
								<span className="settings-theme-option__content">
									<span className="settings-theme-option__title">{option.title}</span>
									<span className="settings-theme-option__description">{option.description}</span>
								</span>
								{isActive && <span className="settings-theme-option__badge">선택됨</span>}
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}

