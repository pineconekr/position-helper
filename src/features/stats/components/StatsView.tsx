'use client'

import { useMemo } from 'react'
import { Panel } from '@/shared/components/ui/Panel'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import {
	calculateStatsSummary,
	calculateFairnessScore,
	getAssignmentSuggestions,
} from '../utils/statsCalculations'
import ActivityTimeline from './ActivityTimeline'
import MemberRoleDistribution from './MemberRoleDistribution'
import AssignmentDeviationChart from './AssignmentDeviationChart'
import FairnessRadarChart from './FairnessRadarChart'

export default function StatsView() {
	const app = useAppStore((s) => s.app)

	const summary = useMemo(() => calculateStatsSummary(app), [app])
	const fairnessScore = useMemo(() => calculateFairnessScore(app), [app])
	const suggestions = useMemo(() => getAssignmentSuggestions(app), [app])

	const hasData = summary.totalWeeks > 0

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-2xl font-bold text-[var(--color-label-primary)]">통계</h1>
				<p className="mt-1 text-sm text-[var(--color-label-secondary)]">
					팀원별 배정 비율, 결석 패턴, 역할 분포를 시각화하여 공정한 배정을 돕습니다.
				</p>
			</div>

			{hasData ? (
				<>
					{/* KPI Dashboard */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Left: Fairness Score & Insights */}
						<FairnessScoreCard
							score={fairnessScore.score}
							level={fairnessScore.level}
							description={fairnessScore.description}
							breakdown={fairnessScore.breakdown}
							insights={fairnessScore.insights}
						/>

						{/* Right: Suggestions */}
						<SuggestionsCard
							underassigned={suggestions.underassigned}
							roleRecommendations={suggestions.roleRecommendations}
						/>
					</div>

					{/* Charts */}
					<div className="space-y-6">
						<AssignmentDeviationChart />
						<ActivityTimeline />
						<MemberRoleDistribution />
					</div>
				</>
			) : (
				<Panel className="py-16">
					<div className="flex flex-col items-center gap-4 text-center">
						<div className="w-16 h-16 rounded-full bg-[var(--color-surface)] flex items-center justify-center">
							<Icon name="insert_chart" size={32} className="text-[var(--color-label-tertiary)]" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-[var(--color-label-primary)] mb-1">
								아직 데이터가 없습니다
							</h3>
							<p className="text-sm text-[var(--color-label-secondary)]">
								배정 탭에서 주차별 배정을 진행하면 여기에 통계가 표시됩니다.
							</p>
						</div>
					</div>
				</Panel>
			)}
		</div>
	)
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Components
// ─────────────────────────────────────────────────────────────────────────────

type InsightData = {
	type: 'issue' | 'positive' | 'suggestion'
	category: 'opportunity' | 'diversity' | 'workload' | 'consecutive' | 'general'
	title: string
	description: string
	affectedMembers?: string[]
}

type BreakdownData = {
	opportunityEquality: { score: number; weight: number; description: string }
	roleDiversity: { score: number; weight: number; description: string }
	workloadBalance: { score: number; weight: number; description: string }
	consecutiveAvoidance: { score: number; weight: number; description: string }
}

// Semantic colors using CSS variables instead of dark: prefixes
const semanticColors = {
	success: {
		text: 'text-[var(--color-success)]',
		bg: 'bg-[var(--color-success)]/10',
		border: 'border-[var(--color-success)]/20',
		iconBg: 'bg-[var(--color-success)]/15'
	},
	accent: {
		text: 'text-[var(--color-accent)]',
		bg: 'bg-[var(--color-accent)]/10',
		border: 'border-[var(--color-accent)]/20',
		iconBg: 'bg-[var(--color-accent)]/15'
	},
	warning: {
		text: 'text-[var(--color-warning)]',
		bg: 'bg-[var(--color-warning)]/10',
		border: 'border-[var(--color-warning)]/20',
		iconBg: 'bg-[var(--color-warning)]/15'
	},
	danger: {
		text: 'text-[var(--color-danger)]',
		bg: 'bg-[var(--color-danger)]/10',
		border: 'border-[var(--color-danger)]/20',
		iconBg: 'bg-[var(--color-danger)]/15'
	},
	neutral: {
		text: 'text-[var(--color-label-secondary)]',
		bg: 'bg-[var(--color-surface)]',
		border: 'border-[var(--color-border-subtle)]',
		iconBg: 'bg-[var(--color-surface-elevated)]'
	}
}

function FairnessScoreCard({
	score,
	level,
	description,
	breakdown,
	insights
}: {
	score: number
	level: 'excellent' | 'good' | 'fair' | 'poor'
	description: string
	breakdown: BreakdownData
	insights: InsightData[]
}) {
	const levelConfig = {
		excellent: {
			colors: semanticColors.success,
			icon: 'verified',
			label: '우수',
		},
		good: {
			colors: semanticColors.accent,
			icon: 'thumb_up_solid',
			label: '양호',
		},
		fair: {
			colors: semanticColors.warning,
			icon: 'scale_solid',
			label: '보통',
		},
		poor: {
			colors: semanticColors.danger,
			icon: 'warning_solid',
			label: '주의',
		}
	}

	const config = levelConfig[level]

	// 인사이트 타입별 스타일 (시맨틱 컬러 사용)
	const insightStyles = {
		issue: {
			icon: 'error',
			...semanticColors.danger
		},
		suggestion: {
			icon: 'lightbulb',
			...semanticColors.warning
		},
		positive: {
			icon: 'check_circle',
			...semanticColors.success
		}
	}

	const hasIssues = insights.some(i => i.type === 'issue')

	// Score에 따라 색상 결정
	const getScoreColor = (s: number) => {
		if (s >= 80) return semanticColors.success.text
		if (s >= 60) return semanticColors.accent.text
		if (s >= 40) return semanticColors.warning.text
		return semanticColors.danger.text
	}

	const getScoreBarColor = (s: number) => {
		if (s >= 80) return 'bg-[var(--color-success)]'
		if (s >= 60) return 'bg-[var(--color-accent)]'
		if (s >= 40) return 'bg-[var(--color-warning)]'
		return 'bg-[var(--color-danger)]'
	}

	return (
		<Panel noPadding className={`border-2 ${config.colors.border} h-full flex flex-col`}>
			{/* Score Header */}
			<div className={`p-5 ${config.colors.bg}`}>
				<div className="flex items-center justify-between gap-4">
					{/* Left: Score & Info */}
					<div className="flex items-center gap-4">
						{/* Score Circle */}
						<div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-surface-elevated)] border-4 border-[var(--color-canvas)]/50 shadow-sm">
							<div className="text-center">
								<div className={`text-2xl font-bold ${config.colors.text}`}>
									{score}
								</div>
								<div className="text-xs text-[var(--color-label-tertiary)]">점</div>
							</div>
						</div>

						{/* Text Info */}
						<div>
							<div className="flex items-center gap-2 mb-0.5">
								<span className="text-base font-semibold text-[var(--color-label-primary)]">
									배정 공정성
								</span>
								<span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.colors.text} ${config.colors.bg}`}>
									{config.label}
								</span>
							</div>
							<p className="text-sm text-[var(--color-label-secondary)]">
								{description}
							</p>
						</div>
					</div>

					{/* Right: Icon */}
					<div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.colors.iconBg}`}>
						<Icon name={config.icon} size={24} className={config.colors.text} />
					</div>
				</div>
			</div>

			{/* Breakdown Section - Radar Chart */}
			<div className="px-5 py-4 border-t border-[var(--color-border-subtle)]">
				<div className="text-xs font-semibold text-[var(--color-label-tertiary)] uppercase tracking-wide mb-2">
					세부 점수
				</div>
				<FairnessRadarChart breakdown={breakdown} compact />
			</div>

			{/* Insights Section */}
			{insights.length > 0 && (
				<div className="px-5 py-4 border-t border-[var(--color-border-subtle)]">
					<div className="flex items-center gap-2 mb-3">
						<div className="text-xs font-semibold text-[var(--color-label-tertiary)] uppercase tracking-wide">
							{hasIssues ? '개선 필요 사항' : '상태 분석'}
						</div>
						{hasIssues && (
							<span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-danger)] text-white">
								{insights.filter(i => i.type === 'issue').length}
							</span>
						)}
					</div>
					<div className="space-y-2">
						{insights.slice(0, 4).map((insight, idx) => {
							const style = insightStyles[insight.type]
							return (
								<div
									key={idx}
									className={`flex items-start gap-2.5 p-3 rounded-lg border ${style.bg} ${style.border}`}
								>
									<Icon name={style.icon} size={16} className={`${style.text} shrink-0 mt-0.5`} />
									<div className="flex-1 min-w-0">
										<div className={`text-sm font-medium ${style.text}`}>
											{insight.title}
										</div>
										<p className="text-xs text-[var(--color-label-secondary)] mt-0.5">
											{insight.description}
										</p>
										{insight.affectedMembers && insight.affectedMembers.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-2">
												{insight.affectedMembers.slice(0, 3).map((member, mIdx) => (
													<span
														key={mIdx}
														className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)]"
													>
														{member}
													</span>
												))}
												{insight.affectedMembers.length > 3 && (
													<span className="text-xs text-[var(--color-label-tertiary)]">
														외 {insight.affectedMembers.length - 3}명
													</span>
												)}
											</div>
										)}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			)}
		</Panel>
	)
}



function SuggestionsCard({
	underassigned,
	roleRecommendations
}: {
	underassigned: { name: string; displayName: string; message: string }[]
	roleRecommendations: { role: string; name: string; displayName: string; weeksAgo: number }[]
}) {
	const hasSuggestions = underassigned.length > 0 || roleRecommendations.length > 0

	// 시맨틱 컬러 사용 (indigo 대체)
	const theme = semanticColors.accent

	return (
		<Panel noPadding className={`border-2 ${theme.border} h-full flex flex-col`}>
			{/* Header */}
			<div className={`p-5 ${theme.bg}`}>
				<div className="flex items-center justify-between gap-4">
					{/* Left: Title & Info */}
					<div>
						<div className="flex items-center gap-2 mb-0.5">
							<span className="text-base font-semibold text-[var(--color-label-primary)]">
								배정 추천
							</span>
							{hasSuggestions && (
								<span className={`text-xs font-medium px-2 py-0.5 rounded-full ${theme.text} ${theme.bg} border ${theme.border}`}>
									AI 제안
								</span>
							)}
						</div>
						<p className="text-sm text-[var(--color-label-secondary)]">
							데이터 분석을 기반으로 배정을 제안합니다
						</p>
					</div>

					{/* Right: Icon */}
					<div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme.iconBg}`}>
						<Icon name="sparkles_solid" size={24} className={theme.text} />
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="p-5 flex-1 min-h-[200px] overflow-y-auto border-t border-[var(--color-border-subtle)]">
				{!hasSuggestions ? (
					<div className="flex flex-col items-center justify-center h-full text-[var(--color-label-tertiary)] py-12">
						<Icon name="thumb_up_alt" size={32} className="mb-2 opacity-20" />
						<p className="text-sm">현재 추천할 내용이 없습니다</p>
					</div>
				) : (
					<div className="space-y-6">
						{/* 1. Underassigned Members */}
						{underassigned.length > 0 && (
							<div>
								<div className={`text-xs font-semibold ${theme.text} uppercase tracking-wide mb-3 flex items-center gap-2`}>
									<Icon name="person_add" size={14} />
									배정 부족 팀원
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{underassigned.slice(0, 4).map((item, idx) => (
										<div key={`underassigned-${idx}`} className="flex flex-col p-2.5 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border-subtle)]">
											<span className="font-medium text-[var(--color-label-primary)] mb-0.5">{item.displayName}</span>
											<span className="text-xs text-[var(--color-label-tertiary)]">
												{item.message}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* 2. Role Recommendations */}
						{roleRecommendations.length > 0 && (
							<div>
								<div className={`text-xs font-semibold ${theme.text} uppercase tracking-wide mb-3 flex items-center gap-2`}>
									<Icon name="category" size={14} />
									역할 추천
								</div>
								<div className="space-y-2">
									{roleRecommendations.slice(0, 4).map((item, idx) => (
										<div key={`role-${idx}`} className={`flex items-center justify-between p-3 ${theme.bg} rounded-lg border ${theme.border} px-3 py-2.5`}>
											<div className="flex items-center gap-2">
												<span className="font-bold text-[var(--color-label-primary)] px-2 py-0.5 bg-[var(--color-surface-elevated)] rounded text-xs border border-[var(--color-border-subtle)]">
													{item.role}
												</span>
												<Icon name="arrow_forward" size={12} className="text-[var(--color-label-tertiary)]" />
												<span className={`text-sm font-semibold ${theme.text}`}>
													{item.displayName}
												</span>
											</div>
											<span className="text-xs text-[var(--color-label-secondary)] whitespace-nowrap ml-2">
												{item.weeksAgo === Infinity ? '기록 없음' : `${item.weeksAgo}주 전 마지막`}
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</Panel>
	)
}
