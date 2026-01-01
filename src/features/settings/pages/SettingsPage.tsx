import { Panel } from '@/shared/components/ui/Panel'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import { useTheme } from '@/shared/theme/ThemeProvider'
import type { MotionPreference } from '@/shared/types'

const motionOptions: Array<{ value: MotionPreference; title: string; description: string; icon: string }> = [
	{
		value: 'system',
		icon: 'computer',
		title: '시스템 설정',
		description: '운영체제의 "동작 줄이기" 설정에 맞춰 자동으로 조절합니다.'
	},
	{
		value: 'allow',
		icon: 'auto_awesome',
		title: '애니메이션 켜기 (기본)',
		description: '모든 부드러운 전환 효과와 모션을 활성화하여 풍부한 경험을 제공합니다.'
	},
	{
		value: 'reduce',
		icon: 'eco',
		title: '애니메이션 끄기',
		description: '전환 효과를 최소화하여 빠르고 간결한 반응 속도를 우선합니다.'
	}
]

export default function SettingsPage() {
	const { theme, setTheme, effectiveTheme } = useTheme()
	const motionPreference = useAppStore((s) => s.motionPreference)
	const setMotionPreference = useAppStore((s) => s.setMotionPreference)

	const themeOptions = [
		{
			value: 'system' as const,
			icon: 'computer',
			title: '시스템 설정',
			description: `운영체제 테마에 맞춰 자동으로 ${effectiveTheme === 'dark' ? '다크' : '라이트'} 모드로 전환합니다.`
		},
		{
			value: 'light' as const,
			icon: 'light_mode',
			title: '라이트 모드',
			description: '밝고 깨끗한 화면으로, 밝은 실내 환경에서 사용하기 적합합니다.'
		},
		{
			value: 'dark' as const,
			icon: 'dark_mode',
			title: '다크 모드',
			description: '어두운 배경으로 눈의 피로를 줄이고 배터리를 절약합니다.'
		}
	]

	const handleResetData = () => {
		if (window.confirm('정말 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			localStorage.clear()
			window.location.reload()
		}
	}

	return (
		<div className="app-main__page">
			{/* Page Header */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
				<h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>설정</h1>
				<p className="muted" style={{ margin: 0, fontSize: '0.9375rem' }}>
					앱의 테마, 화면 표시 방식, 그리고 데이터를 관리합니다.
				</p>
			</div>

			<div className="col" style={{ gap: 24 }}>
				{/* Appearance Section */}
				<Panel style={{ padding: 24 }}>
					<div className="col" style={{ gap: 20 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<Icon name="palette" size={24} style={{ color: 'var(--color-accent)' }} />
							<h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>디자인 테마</h2>
						</div>

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
										<div className="settings-choice-card__icon">
											<Icon name={option.icon} size={20} />
										</div>
										<div className="settings-choice-card__text">
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<span className="settings-choice-card__title">{option.title}</span>
												{isActive && <Badge variant="accent">사용 중</Badge>}
											</div>
											<span className="settings-choice-card__description">{option.description}</span>
										</div>
									</label>
								)
							})}
						</div>
					</div>
				</Panel>

				{/* Motion & Interaction Section */}
				<Panel style={{ padding: 24 }}>
					<div className="col" style={{ gap: 20 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<Icon name="motion_mode" size={24} style={{ color: 'var(--color-accent)' }} />
							<h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>화면 효과</h2>
						</div>

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
										<div className="settings-choice-card__icon">
											<Icon name={option.icon} size={20} />
										</div>
										<div className="settings-choice-card__text">
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												<span className="settings-choice-card__title">{option.title}</span>
												{isActive && <Badge variant="accent">사용 중</Badge>}
											</div>
											<span className="settings-choice-card__description">{option.description}</span>
										</div>
									</label>
								)
							})}
						</div>
					</div>
				</Panel>

				{/* Data Management Section */}
				<Panel style={{ padding: 24, borderColor: 'var(--color-critical-soft)' }}>
					<div className="col" style={{ gap: 16 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<Icon name="database" size={24} style={{ color: 'var(--color-critical)' }} />
							<h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>데이터 관리</h2>
						</div>

						<div style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							flexWrap: 'wrap',
							gap: 16,
							padding: 16,
							background: 'var(--color-surface-2)',
							borderRadius: 'var(--radius-md)'
						}}>
							<div className="col" style={{ gap: 4 }}>
								<strong style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>데이터 초기화</strong>
								<span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
									저장된 모든 설정, 팀원 목록, 활동 기록을 영구적으로 삭제합니다.
								</span>
							</div>
							<Button variant="ghost" onClick={handleResetData} style={{ color: 'var(--color-critical)', borderColor: 'var(--color-critical-soft)', background: 'var(--color-surface-1)' }}>
								모든 데이터 삭제
							</Button>
						</div>
					</div>
				</Panel>

				{/* App Info Footer */}
				<div style={{ textAlign: 'center', marginTop: 16, opacity: 0.6 }}>
					<span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
						Position Helper v1.0.0 &bull; Developed by Pinecone
					</span>
				</div>
			</div>
		</div>
	)
}
