'use client'

import { useMemo } from 'react'
import { Panel } from '@/shared/components/ui/Panel'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import { 
	calculateStatsSummary, 
	calculateAbsenceRanking, 
	calculateAssignmentRanking, 
	calculateUnderassignedMembers 
} from '../utils/statsCalculations'
import ActivityTimeline from './ActivityTimeline'
import MemberRoleDistribution from './MemberRoleDistribution'
import MemberRoleHeatmap from './MemberRoleHeatmap'

export default function StatsView() {
	const app = useAppStore((s) => s.app)

	const summary = useMemo(() => {
		return calculateStatsSummary(app)
	}, [app])

	const absenceRanking = useMemo(() => {
		return calculateAbsenceRanking(app, 3)
	}, [app])

	const assignmentRanking = useMemo(() => {
		return calculateAssignmentRanking(app, 3)
	}, [app])

	const underassignedMembers = useMemo(() => {
		return calculateUnderassignedMembers(app, 3)
	}, [app])

	const hasData = summary.totalWeeks > 0

	return (
		<div className="app-main__page">
			{/* Page Header */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
				<h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>통계</h1>
				<p className="muted" style={{ margin: 0, fontSize: '0.9375rem' }}>
					팀원별 배정 비율, 결석 패턴, 역할 분포를 시각화하여 공정한 배정을 돕습니다.
				</p>
			</div>

			{/* KPI Cards - 3개 랭킹 카드 */}
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
				gap: 16,
				marginBottom: 24
			}}>
				{/* 불참률 TOP 3 */}
				<RankingCard
					icon="event_busy"
					title="불참률 TOP 3"
					subtitle={`총 ${summary.totalWeeks}주 기준`}
					color="--color-warning"
					items={absenceRanking.map((m, i) => ({
						rank: i + 1,
						name: m.displayName,
						value: `${m.absenceRate.toFixed(0)}%`,
						subValue: `${m.absenceCount}회 불참`
					}))}
					emptyText="불참 기록 없음"
				/>

				{/* 최다 배정 TOP 3 */}
				<RankingCard
					icon="emoji_events"
					title="최다 배정 TOP 3"
					subtitle="가장 많이 배정받은 팀원"
					color="--data-series-1"
					items={assignmentRanking.map((m, i) => ({
						rank: i + 1,
						name: m.displayName,
						value: `${m.assignmentCount}회`,
						subValue: `출석 ${m.attendedWeeks}주`
					}))}
					emptyText="배정 기록 없음"
				/>

				{/* 배정 부족 TOP 3 */}
				<RankingCard
					icon="priority_high"
					title="배정 부족 TOP 3"
					subtitle="우선 배정 필요"
					color="--color-error"
					items={underassignedMembers.map((m, i) => ({
						rank: i + 1,
						name: m.displayName,
						value: `${m.assignmentRate.toFixed(1)}회/주`,
						subValue: `${m.assignmentCount}회 / ${m.attendedWeeks}주`
					}))}
					emptyText="배정 기록 없음"
				/>
			</div>

			{/* Charts */}
			{hasData ? (
				<div className="col" style={{ gap: 24 }}>
					{/* 상단: 주차별 활동 매트릭스 */}
					<ActivityTimeline />

					{/* 중단: 팀원별 역할 배정 분포 */}
					<MemberRoleDistribution />

					{/* 하단: 역할별 히트맵 */}
					<MemberRoleHeatmap />
				</div>
			) : (
				<Panel style={{ padding: 48, textAlign: 'center' }}>
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 16
					}}>
						<div style={{
							width: 64,
							height: 64,
							borderRadius: '50%',
							background: 'var(--color-surface-2)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center'
						}}>
							<Icon name="insert_chart" size={32} style={{ color: 'var(--color-text-subtle)' }} />
						</div>
						<div>
							<h3 style={{ margin: '0 0 8px 0', fontSize: '1.125rem', fontWeight: 600 }}>
								아직 데이터가 없습니다
							</h3>
							<p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
								배정 탭에서 주차별 배정을 진행하면 여기에 통계가 표시됩니다.
							</p>
						</div>
					</div>
				</Panel>
			)}
		</div>
	)
}

// 랭킹 카드 컴포넌트
function RankingCard({
	icon,
	title,
	subtitle,
	color,
	items,
	emptyText
}: {
	icon: string
	title: string
	subtitle: string
	color: string
	items: { rank: number; name: string; value: string; subValue: string }[]
	emptyText: string
}) {
	const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'] // 금, 은, 동

	return (
		<Panel style={{ padding: 0, overflow: 'hidden' }}>
			{/* 헤더 */}
			<div style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '14px 16px',
				background: `color-mix(in srgb, var(${color}) 8%, transparent)`,
				borderBottom: '1px solid var(--color-border-subtle)'
			}}>
				<div style={{
					width: 32,
					height: 32,
					borderRadius: 8,
					background: `color-mix(in srgb, var(${color}) 15%, transparent)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0
				}}>
					<Icon name={icon} size={18} style={{ color: `var(${color})` }} />
				</div>
				<div style={{ minWidth: 0 }}>
					<div style={{
						fontSize: '0.875rem',
						fontWeight: 600,
						color: 'var(--color-text-primary)',
						lineHeight: 1.3
					}}>
						{title}
					</div>
					<div style={{
						fontSize: '0.75rem',
						color: 'var(--color-text-muted)'
					}}>
						{subtitle}
					</div>
				</div>
			</div>

			{/* 랭킹 리스트 */}
			<div style={{ padding: '8px 0' }}>
				{items.length > 0 ? (
					items.map((item, idx) => (
						<div
							key={item.rank}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 12,
								padding: '10px 16px',
								transition: 'background 0.15s',
							}}
						>
							{/* 순위 뱃지 */}
							<div style={{
								width: 24,
								height: 24,
								borderRadius: '50%',
								background: idx < 3 ? medalColors[idx] : 'var(--color-surface-2)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: '0.75rem',
								fontWeight: 700,
								color: idx < 3 ? '#fff' : 'var(--color-text-muted)',
								flexShrink: 0,
								boxShadow: idx < 3 ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
							}}>
								{item.rank}
							</div>

							{/* 이름 */}
							<div style={{
								flex: 1,
								fontSize: '0.9375rem',
								fontWeight: 500,
								color: 'var(--color-text-primary)',
								minWidth: 0,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap'
							}}>
								{item.name}
							</div>

							{/* 수치 */}
							<div style={{ textAlign: 'right', flexShrink: 0 }}>
								<div style={{
									fontSize: '0.9375rem',
									fontWeight: 700,
									color: `var(${color})`
								}}>
									{item.value}
								</div>
								<div style={{
									fontSize: '0.6875rem',
									color: 'var(--color-text-muted)'
								}}>
									{item.subValue}
								</div>
							</div>
						</div>
					))
				) : (
					<div style={{
						padding: '24px 16px',
						textAlign: 'center',
						color: 'var(--color-text-muted)',
						fontSize: '0.875rem'
					}}>
						{emptyText}
					</div>
				)}
			</div>
		</Panel>
	)
}
