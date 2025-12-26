import { useEffect, useState } from 'react'
import Modal from '@/shared/components/common/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { useAppStore } from '@/shared/state/store'
import { suggestAssignments, SuggestionOption, SuggestionResult } from '@/shared/utils/suggestion'
import { PartAssignment, RoleKey } from '@/shared/types'

type Props = {
	isOpen: boolean
	onClose: () => void
	onApply: (part1: PartAssignment, part2: PartAssignment) => void
}

const ROLES: RoleKey[] = ['SW', '자막', '고정', '사이드', '스케치']

export default function SuggestionModal({ isOpen, onClose, onApply }: Props) {
	const app = useAppStore((s) => s.app)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const draft = useAppStore((s) => s.currentDraft)
	
	const [option, setOption] = useState<SuggestionOption>('fillEmptyOnly')
	const [result, setResult] = useState<SuggestionResult | null>(null)
	const [isCalculating, setIsCalculating] = useState(false)

	// 모달이 열릴 때나 옵션이 바뀔 때 제안 다시 생성
	useEffect(() => {
		if (isOpen && currentWeekDate) {
			setIsCalculating(true)
			// UI 렌더링 블로킹 방지를 위해 setTimeout 사용
			setTimeout(() => {
				const res = suggestAssignments(app, currentWeekDate, draft, option)
				setResult(res)
				setIsCalculating(false)
			}, 50)
		}
	}, [isOpen, option, currentWeekDate, app, draft])

	const handleApply = () => {
		if (result) {
			onApply(result.part1, result.part2)
			onClose()
		}
	}

	const handleMemberChange = (part: 'part1' | 'part2', role: RoleKey, index: number, newName: string) => {
		if (!result) return
		const newResult = { ...result }
		const targetPart = part === 'part1' ? newResult.part1 : newResult.part2
		
		if (role === '사이드') {
			const side = [...targetPart.사이드] as [string, string]
			side[index] = newName
			targetPart.사이드 = side
		} else {
			(targetPart as any)[role] = newName
		}
		
		setResult(newResult)
	}

	// 활성 멤버 목록 (Select 옵션용)
	const activeMembers = (app?.members || [])
		.filter(m => m.active)
		.map(m => m.name)
		.sort((a, b) => a.localeCompare(b, 'ko'))

	const renderReasonBadge = (part: 'part1' | 'part2', role: RoleKey, memberName: string) => {
		const suggestion = result?.suggestions.find(
			s => s.part === part && s.role === role && s.member === memberName
		)
		
		if (!suggestion || suggestion.reasons.length === 0) return null

		// 가장 점수가 높은(중요한) 사유 하나만 표시
		const mainReason = suggestion.reasons.sort((a, b) => b.score - a.score)[0]
		if (!mainReason) return null

		let badgeVariant: 'accent' | 'success' | 'warning' | 'neutral' = 'neutral'
		let icon = ''

		switch (mainReason.type) {
			case 'recency':
				badgeVariant = 'success'
				icon = 'history'
				break
			case 'workload':
				badgeVariant = 'accent'
				icon = 'balance'
				break
			case 'role_balance':
				badgeVariant = 'warning'
				icon = 'school'
				break
			case 'rest':
				badgeVariant = 'success'
				icon = 'spa'
				break
			default:
				badgeVariant = 'neutral'
		}

		return (
			<Badge variant={badgeVariant} style={{ fontSize: '0.75rem', height: 20, padding: '0 6px' }}>
				{icon && <span className="material-symbol" style={{ fontSize: 14, marginRight: 4 }}>{icon}</span>}
				{mainReason.message}
			</Badge>
		)
	}

	const renderRoleRow = (partKey: 'part1' | 'part2', role: RoleKey, idx: number = 0, label?: string) => {
		if (!result) return null
		const data = partKey === 'part1' ? result.part1 : result.part2
		const value = role === '사이드' ? data.사이드[idx] : (data as any)[role]
		const displayLabel = label || role

		return (
			<div 
				key={`${role}-${idx}`} 
				style={{ 
					display: 'flex', 
					alignItems: 'center', 
					gap: 12, 
					padding: '8px 12px', 
					background: 'var(--color-surface-1)', 
					borderRadius: 'var(--radius-md)',
					border: '1px solid var(--color-border-subtle)'
				}}
			>
				<div style={{ width: 60, fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
					{displayLabel}
				</div>
				<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
					<select
						style={{ 
							width: '100%', 
							height: 32, 
							padding: '0 8px',
							borderRadius: 'var(--radius-sm)',
							border: '1px solid var(--color-border-subtle)',
							background: 'var(--color-canvas)',
							color: 'var(--color-text-primary)',
							fontSize: '0.9375rem'
						}}
						value={value}
						onChange={(e) => handleMemberChange(partKey, role, idx, e.target.value)}
					>
						<option value="">(미배정)</option>
						{activeMembers.map(m => (
							<option key={m} value={m}>{m}</option>
						))}
					</select>
				</div>
				<div style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>
					{value && renderReasonBadge(partKey, role, value)}
				</div>
			</div>
		)
	}

	const renderPartColumn = (label: string, partKey: 'part1' | 'part2') => {
		return (
			<div className="col" style={{ flex: 1, gap: 12, minWidth: 280 }}>
				<div style={{ 
					padding: '8px 12px', 
					background: 'var(--color-surface-2)', 
					borderRadius: 'var(--radius-md)',
					fontSize: '0.9375rem', 
					fontWeight: 600, 
					color: 'var(--color-text-primary)',
					display: 'flex',
					alignItems: 'center',
					gap: 8
				}}>
					<span className="material-symbol" style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>
						{partKey === 'part1' ? 'sunny' : 'nightlight'}
					</span>
					{label}
				</div>
				<div className="col" style={{ gap: 8 }}>
					{ROLES.map(role => {
						if (role === '사이드') {
							return [0, 1].map(idx => renderRoleRow(partKey, role, idx, `${role} ${idx + 1}`))
						}
						return renderRoleRow(partKey, role)
					})}
				</div>
			</div>
		)
	}

	const footer = (
		<>
			<Button variant="ghost" onClick={onClose}>취소</Button>
			<Button variant="primary" icon="check" onClick={handleApply}>
				이대로 적용하기
			</Button>
		</>
	)

	return (
		<Modal open={isOpen} onClose={onClose} title="AI 배정 제안" width={800} footer={footer}>
			<div className="col" style={{ gap: 24 }}>
				
				{/* Options */}
				<div className="col" style={{ gap: 12 }}>
					<span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>제안 옵션</span>
					<div className="settings-choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
						<label className={`settings-choice-card ${option === 'fillEmptyOnly' ? 'settings-choice-card--active' : ''}`}>
							<input 
								type="radio" 
								name="suggestionOption" 
								className="settings-choice-card__input"
								checked={option === 'fillEmptyOnly'} 
								onChange={() => setOption('fillEmptyOnly')}
							/>
							<div className="settings-choice-card__icon">
								<span className="material-symbol">edit_square</span>
							</div>
							<div className="settings-choice-card__text">
								<span className="settings-choice-card__title">빈칸만 채우기</span>
								<span className="settings-choice-card__description">현재 입력된 배정은 유지하고 빈칸만 채웁니다.</span>
							</div>
						</label>

						<label className={`settings-choice-card ${option === 'overwriteAll' ? 'settings-choice-card--active' : ''}`}>
							<input 
								type="radio" 
								name="suggestionOption" 
								className="settings-choice-card__input"
								checked={option === 'overwriteAll'} 
								onChange={() => setOption('overwriteAll')}
							/>
							<div className="settings-choice-card__icon">
								<span className="material-symbol">restart_alt</span>
							</div>
							<div className="settings-choice-card__text">
								<span className="settings-choice-card__title">전체 새로 배정</span>
								<span className="settings-choice-card__description">모든 배정을 초기화하고 새로 제안합니다.</span>
							</div>
						</label>
					</div>
				</div>

				{/* Content */}
				<div style={{ background: 'var(--color-canvas)', borderRadius: 'var(--radius-lg)', padding: 16, border: '1px solid var(--color-border-subtle)' }}>
					{isCalculating ? (
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16, color: 'var(--color-text-muted)' }}>
							<span className="material-symbol" style={{ fontSize: 32, animation: 'spin 1s linear infinite' }}>sync</span>
							<span>최적의 조합을 계산하고 있습니다...</span>
						</div>
					) : (
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
							{renderPartColumn('1부 (오전)', 'part1')}
							{renderPartColumn('2부 (오후)', 'part2')}
						</div>
					)}
				</div>
			</div>
			<style>{`
				@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
			`}</style>
		</Modal>
	)
}
