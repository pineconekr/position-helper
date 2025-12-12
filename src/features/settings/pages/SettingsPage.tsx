import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import { useTheme } from '@/shared/theme/ThemeProvider'
import type { MotionPreference } from '@/shared/state/store'

const motionOptions: Array<{ value: MotionPreference; title: string; description: string; icon: string }> = [
	{
		value: 'allow',
		icon: 'auto_awesome',
		title: '애니메이션 사용',
		description: '항상 부드러운 전환을 사용합니다. 시스템 설정과 무관하게 애니메이션이 유지됩니다.'
	},
	{
		value: 'system',
		icon: 'computer',
		title: '시스템과 동일',
		description: '운영체제의 접근성 설정(prefers-reduced-motion)을 그대로 따릅니다.'
	},
	{
		value: 'reduce',
		icon: 'eco',
		title: '애니메이션 최소화',
		description: '전환·차트 모션을 즉시 완료해 움직임을 줄입니다.'
	}
]

export default function SettingsPage() {
	const { theme, setTheme, effectiveTheme } = useTheme()
	const motionPreference = useAppStore((s) => s.motionPreference)
	const setMotionPreference = useAppStore((s) => s.setMotionPreference)

	const themeOptions = [
		{
			value: 'system' as const,
			icon: 'settings_brightness',
			title: '시스템 모드',
			description: `운영체제 설정에 맞춰 자동으로 ${effectiveTheme === 'dark' ? '다크' : '라이트'} 모드가 적용됩니다.`
		},
		{
			value: 'light' as const,
			icon: 'light_mode',
			title: '라이트 모드',
			description: '밝고 선명한 화면 구성으로 실내 환경에서 또렷하게 확인하세요.'
		},
		{
			value: 'dark' as const,
			icon: 'dark_mode',
			title: '다크 모드',
			description: '눈부심을 줄여 야간에도 편안하게 사용할 수 있습니다.'
		}
	]

	return (
		<Panel className="col" style={{ gap: 32, padding: 24 }}>
			<div className="settings-section">
				<h3 className="settings-section__title" style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>테마</h3>
				<p className="settings-section__description" style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
					상단 내비게이션의 아이콘 버튼으로도 빠르게 전환할 수 있습니다.
				</p>
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
										<span className="material-symbol">{option.icon}</span>
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
				<h3 className="settings-section__title" style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>애니메이션</h3>
				<p className="settings-section__description" style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
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
										<span className="material-symbol">{option.icon}</span>
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
		</Panel>
	)
}
