'use client'

import { Panel } from '@/shared/components/ui/Panel'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import { useTheme } from '@/shared/theme/ThemeProvider'
import type { MotionPreference, ThemePreference } from '@/shared/types'

const motionOptions: Array<{ value: MotionPreference; title: string; description: string; icon: string }> = [
	{
		value: 'system',
		icon: 'computer',
		title: '시스템 설정',
		description: '운영체제 설정에 따라 자동으로 조절'
	},
	{
		value: 'allow',
		icon: 'auto_awesome',
		title: '애니메이션 켜기',
		description: '부드러운 전환 효과 활성화'
	},
	{
		value: 'reduce',
		icon: 'eco',
		title: '애니메이션 끄기',
		description: '빠른 반응 속도 우선'
	}
]

export default function SettingsPage() {
	const { theme, setTheme, effectiveTheme } = useTheme()
	const motionPreference = useAppStore((s) => s.motionPreference)
	const setMotionPreference = useAppStore((s) => s.setMotionPreference)

	const themeOptions: Array<{ value: ThemePreference; title: string; description: string; icon: string }> = [
		{
			value: 'system',
			icon: 'computer',
			title: '시스템 설정',
			description: `운영체제에 따라 ${effectiveTheme === 'dark' ? '다크' : '라이트'} 모드`
		},
		{
			value: 'light',
			icon: 'light_mode',
			title: '라이트 모드',
			description: '밝은 환경에 적합'
		},
		{
			value: 'dark',
			icon: 'dark_mode',
			title: '다크 모드',
			description: '눈의 피로 감소'
		}
	]

	const handleResetData = () => {
		if (window.confirm('정말 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
			localStorage.clear()
			window.location.reload()
		}
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl font-bold text-slate-900 dark:text-white">설정</h1>
				<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
					앱의 테마, 화면 효과, 그리고 데이터를 관리합니다.
				</p>
			</div>

			{/* Theme Section */}
			<Panel>
				<div className="flex items-center gap-3 mb-6">
					<div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
						<Icon name="palette" size={20} className="text-blue-600 dark:text-blue-400" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-slate-900 dark:text-white">테마</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400">화면의 색상 모드를 선택하세요</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{themeOptions.map((option) => {
						const isActive = theme === option.value
						return (
							<button
								key={option.value}
								onClick={() => setTheme(option.value)}
								className={`
									relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all
									${isActive
										? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
										: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
									}
								`}
							>
								{isActive && (
									<div className="absolute top-3 right-3">
										<Icon name="check_circle" size={20} className="text-blue-600 dark:text-blue-400" />
									</div>
								)}
								<div className={`w-10 h-10 rounded-lg flex items-center justify-center
									${isActive
										? 'bg-blue-100 dark:bg-blue-500/20'
										: 'bg-slate-100 dark:bg-slate-800'
									}`}>
									<Icon name={option.icon} size={20}
										className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}
									/>
								</div>
								<div>
									<div className="font-medium text-slate-900 dark:text-white">{option.title}</div>
									<div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{option.description}</div>
								</div>
							</button>
						)
					})}
				</div>
			</Panel>

			{/* Motion Section */}
			<Panel>
				<div className="flex items-center gap-3 mb-6">
					<div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
						<Icon name="motion_mode" size={20} className="text-purple-600 dark:text-purple-400" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-slate-900 dark:text-white">화면 효과</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400">애니메이션 및 전환 효과를 설정하세요</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{motionOptions.map((option) => {
						const isActive = motionPreference === option.value
						return (
							<button
								key={option.value}
								onClick={() => setMotionPreference(option.value)}
								className={`
									relative flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all
									${isActive
										? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10'
										: 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
									}
								`}
							>
								{isActive && (
									<div className="absolute top-3 right-3">
										<Icon name="check_circle" size={20} className="text-purple-600 dark:text-purple-400" />
									</div>
								)}
								<div className={`w-10 h-10 rounded-lg flex items-center justify-center
									${isActive
										? 'bg-purple-100 dark:bg-purple-500/20'
										: 'bg-slate-100 dark:bg-slate-800'
									}`}>
									<Icon name={option.icon} size={20}
										className={isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400'}
									/>
								</div>
								<div>
									<div className="font-medium text-slate-900 dark:text-white">{option.title}</div>
									<div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{option.description}</div>
								</div>
							</button>
						)
					})}
				</div>
			</Panel>

			{/* Danger Zone */}
			<Panel className="border-red-200 dark:border-red-900/50">
				<div className="flex items-center gap-3 mb-6">
					<div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
						<Icon name="warning" size={20} className="text-red-600 dark:text-red-400" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-slate-900 dark:text-white">위험 영역</h2>
						<p className="text-sm text-slate-500 dark:text-slate-400">되돌릴 수 없는 작업입니다</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
					<div>
						<div className="font-medium text-slate-900 dark:text-white">데이터 초기화</div>
						<div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
							모든 설정, 팀원 목록, 활동 기록을 영구 삭제합니다
						</div>
					</div>
					<Button
						variant="danger"
						onClick={handleResetData}
						icon="delete"
					>
						모든 데이터 삭제
					</Button>
				</div>
			</Panel>

			{/* Footer */}
			<div className="text-center pt-4 pb-8">
				<p className="text-sm text-slate-400 dark:text-slate-500">
					Position Helper v1.0.0 • Made with ❤️
				</p>
			</div>
		</div>
	)
}
