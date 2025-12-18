import { useState } from 'react'
import { Badge } from '@/shared/components/ui/Badge'
import { Panel } from '@/shared/components/ui/Panel'
import { useAppStore } from '@/shared/state/store'
import type { Warning, RoleKey } from '@/shared/types'

export default function WarningWidget() {
	const warnings = useAppStore((s) => s.warnings)
	const [groupBy, setGroupBy] = useState<'none' | 'role' | 'name'>('role')

	if (warnings.length === 0) return null

	// --- Helper Logic (extracted from AssignmentBoard) ---
	const severityRank = (lv: Warning['level']) => lv === 'error' ? 2 : lv === 'warn' ? 1 : 0
	const levelIcon: Record<Warning['level'], { icon: string; color: string; label: string }> = {
		error: { icon: 'error', color: 'var(--color-critical)', label: '위험' },
		warn: { icon: 'warning', color: 'var(--color-warning)', label: '주의' },
		info: { icon: 'info', color: 'var(--color-accent)', label: '알림' }
	}
	const roleOrder: RoleKey[] = ['SW', '고정', '스케치', '사이드', '자막']
	const roleRank = (r?: RoleKey) => (r ? roleOrder.indexOf(r) : roleOrder.length + 1)

	const nameCounts = new Map<string, number>()
	warnings.forEach((w) => {
		const n = w.target?.name
		if (!n) return
		nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1)
	})

	const sortedWarnings = [...warnings].sort((a, b) => {
		const bySev = severityRank(b.level) - severityRank(a.level)
		if (bySev) return bySev
		const byNameLoad = (nameCounts.get(b.target?.name ?? '') ?? 0) - (nameCounts.get(a.target?.name ?? '') ?? 0)
		if (byNameLoad) return byNameLoad
		const byRole = roleRank(a.target?.role) - roleRank(b.target?.role)
		if (byRole) return byRole
		const partRank = (p?: 'part1' | 'part2') => (p === 'part1' ? 0 : p === 'part2' ? 1 : 2)
		const byPart = partRank(a.target?.part) - partRank(b.target?.part)
		if (byPart) return byPart
		return a.id.localeCompare(b.id)
	})

	// Summary Stats
	type Key = string
	const summary = new Map<Key, number>()
	const keyLabel = (key: Key) => {
		const [role, part] = key.split('|')
		return `${role}${part ? `/${part === 'part1' ? '1부' : '2부'}` : ''}`
	}
	warnings.forEach((w) => {
		const k: Key = `${w.target?.role ?? '기타'}|${w.target?.part ?? ''}`
		summary.set(k, (summary.get(k) ?? 0) + 1)
	})
	const sortedSummary = [...summary.entries()].sort((a, b) => b[1] - a[1])

	// Grouping
	type GroupKey = string
	const groupMap = new Map<GroupKey, Warning[]>()
	const groupLabel = (k: GroupKey) => k

	if (groupBy === 'role') {
		sortedWarnings.forEach((w) => {
			const k: GroupKey = w.target?.role ?? '기타'
			if (!groupMap.has(k)) groupMap.set(k, [])
			groupMap.get(k)!.push(w)
		})
	} else if (groupBy === 'name') {
		sortedWarnings.forEach((w) => {
			const k: GroupKey = w.target?.name ?? '(이름 없음)'
			if (!groupMap.has(k)) groupMap.set(k, [])
			groupMap.get(k)!.push(w)
		})
	}

	const groupedEntries = groupBy === 'none'
		? [['전체', sortedWarnings] as [GroupKey, Warning[]]]
		: [...groupMap.entries()].sort((a, b) => b[1].length - a[1].length)

	// --- Render Components ---
	const WarningCard = ({ w }: { w: Warning }) => {
		const meta = levelIcon[w.level] ?? levelIcon.warn
		return (
			<div className="warning-item">
				<div className="warning-item__icon">
					<span className="material-symbol" style={{ color: meta.color }}>{meta.icon}</span>
				</div>
				<div className="warning-item__content">
					<div className="warning-item__message">{w.message}</div>
					<div className="warning-item__meta">
						{(w.target?.role || w.target?.part) && (
							<span className="warning-tag">
								{w.target?.part ? (w.target.part === 'part1' ? '1부' : '2부') : ''}
								{w.target?.part && w.target?.role ? ' · ' : ''}
								{w.target?.role}
							</span>
						)}
						{(w.target?.name || w.target?.date) && (
							<span className="warning-tag">
								{w.target?.name}
								{w.target?.name && w.target?.date ? ' · ' : ''}
								{w.target?.date}
							</span>
						)}
					</div>
				</div>
			</div>
		)
	}

	return (
		<Panel className="warning-widget">
			<div className="warning-widget__header">
				<div className="warning-widget__title-area">
					<h3 className="warning-widget__title">경고 상세</h3>
					<span className="warning-widget__count">{warnings.length}</span>
				</div>
				<div className="warning-widget__actions">
					<select 
						className="warning-widget__select"
						value={groupBy} 
						onChange={(e) => setGroupBy(e.target.value as any)}
					>
						<option value="role">역할별</option>
						<option value="name">이름별</option>
						<option value="none">전체</option>
					</select>
				</div>
			</div>

			{sortedSummary.length > 0 && (
				<div className="warning-widget__summary">
					{sortedSummary.map(([k, c]) => (
						<Badge key={k} variant="warning" className="warning-summary-chip">
							{keyLabel(k)} <span className="count">{c}</span>
						</Badge>
					))}
				</div>
			)}

			<div className="warning-widget__list">
				{groupedEntries.map(([k, arr]) => (
					<div key={k} className="warning-group">
						{groupBy !== 'none' && (
							<div className="warning-group__header">
								<span className="warning-group__title">{groupLabel(k)}</span>
								<span className="warning-group__count">{arr.length}</span>
							</div>
						)}
						<div className="warning-group__items">
							{arr.map((w) => <WarningCard key={w.id} w={w} />)}
						</div>
					</div>
				))}
			</div>
		</Panel>
	)
}

