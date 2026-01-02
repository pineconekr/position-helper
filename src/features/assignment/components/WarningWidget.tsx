'use client'

import { useState } from 'react'
import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import { useShouldReduceMotion } from '@/shared/utils/motion'
import type { Warning } from '@/shared/types'

const levelConfig: Record<Warning['level'], { icon: string; bg: string; border: string; text: string }> = {
	error: {
		icon: 'error',
		bg: 'rgba(239, 68, 68, 0.08)',
		border: 'rgba(239, 68, 68, 0.25)',
		text: 'rgb(239, 68, 68)'
	},
	warn: {
		icon: 'warning',
		bg: 'rgba(245, 158, 11, 0.08)',
		border: 'rgba(245, 158, 11, 0.25)',
		text: 'rgb(245, 158, 11)'
	},
	info: {
		icon: 'info',
		bg: 'rgba(59, 130, 246, 0.08)',
		border: 'rgba(59, 130, 246, 0.25)',
		text: 'rgb(59, 130, 246)'
	}
}

function WarningItem({ warning, index }: { warning: Warning; index: number }) {
	const config = levelConfig[warning.level] ?? levelConfig.warn
	const partLabel = warning.target?.part === 'part1' ? '1부' : warning.target?.part === 'part2' ? '2부' : null

	return (
		<div
			style={{
				display: 'flex',
				gap: 12,
				padding: '12px 14px',
				background: config.bg,
				borderRadius: 12,
				border: `1px solid ${config.border}`,
				alignItems: 'flex-start'
			}}
		>
			<div
				style={{
					width: 28,
					height: 28,
					borderRadius: 8,
					display: 'grid',
					placeItems: 'center',
					background: config.border,
					flexShrink: 0
				}}
			>
				<Icon name={config.icon} size={16} style={{ color: config.text }} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
					{warning.message}
				</div>
				<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
					{partLabel && (
						<span style={{
							fontSize: 11,
							padding: '2px 8px',
							borderRadius: 6,
							background: 'var(--color-surface-2)',
							color: 'var(--color-text-muted)'
						}}>
							{partLabel}
						</span>
					)}
					{warning.target?.role && (
						<span style={{
							fontSize: 11,
							padding: '2px 8px',
							borderRadius: 6,
							background: 'var(--color-surface-2)',
							color: 'var(--color-text-muted)'
						}}>
							{warning.target.role}
						</span>
					)}
					{warning.target?.name && (
						<span style={{
							fontSize: 11,
							padding: '2px 8px',
							borderRadius: 6,
							background: 'var(--color-accent-soft)',
							color: 'var(--color-accent)'
						}}>
							{warning.target.name}
						</span>
					)}
				</div>
			</div>
		</div>
	)
}

export default function WarningWidget() {
	const warnings = useAppStore((s) => s.warnings)
	const shouldReduce = useShouldReduceMotion()
	const [isExpanded, setIsExpanded] = useState(true)

	if (warnings.length === 0) {
		return (
			<div
				style={{
					padding: '16px 20px',
					borderRadius: 16,
					background: 'rgba(34, 197, 94, 0.06)',
					border: '1px solid rgba(34, 197, 94, 0.2)',
					display: 'flex',
					alignItems: 'center',
					gap: 12
				}}
			>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: 10,
						display: 'grid',
						placeItems: 'center',
						background: 'rgba(34, 197, 94, 0.15)'
					}}
				>
					<Icon name="check_circle" size={20} style={{ color: 'rgb(34, 197, 94)' }} />
				</div>
				<div>
					<div style={{ fontSize: 14, fontWeight: 600, color: 'rgb(34, 197, 94)' }}>
						문제 없음
					</div>
					<div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
						현재 경고 사항이 없습니다
					</div>
				</div>
			</div>
		)
	}

	const errorCount = warnings.filter(w => w.level === 'error').length
	const warnCount = warnings.filter(w => w.level === 'warn').length

	const sortedWarnings = [...warnings].sort((a, b) => {
		const levelRank = { error: 0, warn: 1, info: 2 }
		return (levelRank[a.level] ?? 2) - (levelRank[b.level] ?? 2)
	})

	const content = (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			{sortedWarnings.map((w, i) => (
				<WarningItem key={w.id} warning={w} index={i} />
			))}
		</div>
	)

	return (
		<div
			style={{
				borderRadius: 16,
				background: 'var(--color-surface-1)',
				border: '1px solid var(--color-border-subtle)',
				overflow: 'hidden'
			}}
		>
			{/* Header */}
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				style={{
					width: '100%',
					padding: '14px 16px',
					display: 'flex',
					alignItems: 'center',
					gap: 12,
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					textAlign: 'left'
				}}
			>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: 10,
						display: 'grid',
						placeItems: 'center',
						background: errorCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)'
					}}
				>
					<Icon
						name={errorCount > 0 ? 'error' : 'warning'}
						size={20}
						style={{ color: errorCount > 0 ? 'rgb(239, 68, 68)' : 'rgb(245, 158, 11)' }}
					/>
				</div>
				<div style={{ flex: 1 }}>
					<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
						{warnings.length}개의 경고
					</div>
					<div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8 }}>
						{errorCount > 0 && <span style={{ color: 'rgb(239, 68, 68)' }}>위험 {errorCount}</span>}
						{warnCount > 0 && <span style={{ color: 'rgb(245, 158, 11)' }}>주의 {warnCount}</span>}
					</div>
				</div>
				<Icon
					name="expand_more"
					size={20}
					style={{
						color: 'var(--color-text-muted)',
						transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
						transition: 'transform 0.2s ease'
					}}
				/>
			</button>

			{/* Content */}
			{shouldReduce ? (
				isExpanded && (
					<div style={{ padding: '0 16px 16px' }}>
						{content}
					</div>
				)
			) : (
				<LazyMotion features={domAnimation} strict>
					<AnimatePresence>
						{isExpanded && (
							<m.div
								key="warning-content"
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ type: 'spring', stiffness: 400, damping: 35 }}
								style={{ overflow: 'hidden' }}
							>
								<div style={{ padding: '0 16px 16px' }}>
									{content}
								</div>
							</m.div>
						)}
					</AnimatePresence>
				</LazyMotion>
			)}
		</div>
	)
}
