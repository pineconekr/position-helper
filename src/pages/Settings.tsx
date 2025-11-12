import { useAppStore } from '../state/store'
import type { MotionPreference } from '../state/store'

const motionOptions: Array<{ value: MotionPreference; title: string; description: string; icon: string }> = [
	{
		value: 'allow',
		icon: '✨',
		title: '애니메이션 사용',
		description: '항상 부드러운 전환을 사용합니다. 시스템 설정과 무관하게 애니메이션이 유지됩니다.'
	},
	{
		value: 'system',
		icon: '🖥️',
		title: '시스템과 동일',
		description: '운영체제의 접근성 설정(prefers-reduced-motion)을 그대로 따릅니다.'
	},
	{
		value: 'reduce',
		icon: '🌿',
		title: '애니메이션 최소화',
		description: '전환·차트 모션을 즉시 완료해 움직임을 줄입니다.'
	}
]

export default function Settings() {
	const theme = useAppStore((s) => s.theme)
	const setTheme = useAppStore((s) => s.setTheme)
	const effectiveTheme = useAppStore((s) => s.getEffectiveTheme())
	const motionPreference = useAppStore((s) => s.motionPreference)
	const setMotionPreference = useAppStore((s) => s.setMotionPreference)

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
				<p className="settings-section__description">상단 내비게이션의 이모지 버튼으로도 빠르게 전환할 수 있습니다.</p>
				<div className="settings-choice-grid" role="radiogroup" aria-label="테마 모드">
					{themeOptions.map((option) => {
						const isActive = theme === option.value
						return (
							<label
								key={option.value}
								className={`settings-choice-card${isActive ? ' settings-choice-card--active' : ''}`}
							>
								<input
									type="radio"
									name="theme-mode"
									value={option.value}
									checked={isActive}
									onChange={() => setTheme(option.value)}
									className="settings-choice-card__input"
								/>
								<span className="settings-choice-card__indicator" aria-hidden="true" />
								<span className="settings-choice-card__body">
									<span className="settings-choice-card__icon" aria-hidden="true">
										{option.icon}
									</span>
									<span className="settings-choice-card__text">
										<span className="settings-choice-card__title">{option.title}</span>
										<span className="settings-choice-card__description">{option.description}</span>
									</span>
								</span>
							</label>
						)
					})}
				</div>
			</div>

			<div className="settings-section">
				<h3 className="settings-section__title">애니메이션</h3>
				<p className="settings-section__description">
					데이터 변환과 페이지 전환을 부드럽게 보여주되, 필요할 때는 애니메이션을 최소화하거나 시스템 설정을 따를 수 있습니다.
				</p>
				<div className="settings-choice-grid" role="radiogroup" aria-label="애니메이션 선호도">
					{motionOptions.map((option) => {
						const isActive = motionPreference === option.value
						return (
							<label
								key={option.value}
								className={`settings-choice-card${isActive ? ' settings-choice-card--active' : ''}`}
							>
								<input
									type="radio"
									name="motion-preference"
									value={option.value}
									checked={isActive}
									onChange={() => setMotionPreference(option.value)}
									className="settings-choice-card__input"
								/>
								<span className="settings-choice-card__indicator" aria-hidden="true" />
								<span className="settings-choice-card__body">
									<span className="settings-choice-card__icon" aria-hidden="true">
										{option.icon}
									</span>
									<span className="settings-choice-card__text">
										<span className="settings-choice-card__title">{option.title}</span>
										<span className="settings-choice-card__description">{option.description}</span>
									</span>
								</span>
							</label>
						)
					})}
				</div>
			</div>
		</div>
	)
}

