'use client'

import { useMemo, Suspense, lazy, useState, useEffect } from 'react'
import { Panel } from '@/shared/components/ui/Panel'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import {
	calculateStatsSummary
} from '../utils/statsCalculations'

// Lazy load heavy chart components
const ActivityTimeline = lazy(() => import('./ActivityTimeline'))
const MemberRoleDistribution = lazy(() => import('./MemberRoleDistribution'))
const AssignmentDeviationChart = lazy(() => import('./AssignmentDeviationChart'))
const FairnessIndicators = lazy(() => import('./FairnessIndicators'))
const AssignmentSuggestions = lazy(() => import('./AssignmentSuggestions'))

// Chart loading skeleton - lightweight
function ChartSkeleton({ height = 300 }: { height?: number }) {
	return (
		<div
			className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl"
			style={{ height }}
		/>
	)
}

// KPI skeleton - lightweight
function KPISkeleton() {
	return (
		<div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl h-[400px]" />
	)
}

// Deferred content wrapper - delays heavy content until after LCP
function DeferredContent({ children }: { children: React.ReactNode }) {
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		// Use requestIdleCallback if available, otherwise setTimeout
		if ('requestIdleCallback' in window) {
			const id = window.requestIdleCallback(() => setIsReady(true), { timeout: 100 })
			return () => window.cancelIdleCallback(id)
		} else {
			const id = setTimeout(() => setIsReady(true), 0)
			return () => clearTimeout(id)
		}
	}, [])

	if (!isReady) {
		return null
	}

	return <>{children}</>
}

// Static page header - renders immediately
function PageHeader() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-[var(--color-label-primary)]">통계</h1>
			<p className="mt-1 text-sm text-[var(--color-label-secondary)]">
				팀원별 배정 비율, 결석 패턴, 역할 분포를 시각화하여 공정한 배정을 돕습니다.
			</p>
		</div>
	)
}

// Data-dependent content
function StatsContent() {
	const app = useAppStore((s) => s.app)
	const summary = useMemo(() => calculateStatsSummary(app), [app])
	const hasData = summary.totalWeeks > 0

	if (!hasData) {
		return (
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
		)
	}

	return (
		<>
			{/* KPI Dashboard */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<Suspense fallback={<KPISkeleton />}>
					<FairnessIndicators />
				</Suspense>
				<Suspense fallback={<KPISkeleton />}>
					<AssignmentSuggestions />
				</Suspense>
			</div>

			{/* Charts */}
			<div className="space-y-6">
				<Suspense fallback={<ChartSkeleton height={360} />}>
					<AssignmentDeviationChart />
				</Suspense>
				<Suspense fallback={<ChartSkeleton height={400} />}>
					<ActivityTimeline />
				</Suspense>
				<Suspense fallback={<ChartSkeleton height={450} />}>
					<MemberRoleDistribution />
				</Suspense>
			</div>
		</>
	)
}

export default function StatsView() {
	return (
		<div className="space-y-8">
			{/* Page Header - renders immediately for LCP */}
			<PageHeader />

			{/* Deferred heavy content - loads after paint */}
			<DeferredContent>
				<StatsContent />
			</DeferredContent>
		</div>
	)
}
