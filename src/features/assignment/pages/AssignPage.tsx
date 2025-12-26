import { useState } from 'react'
import AssignmentBoard from '@/features/assignment/components/AssignmentBoard'
import SuggestionModal from '@/features/assignment/components/SuggestionModal'
import { useAppStore } from '@/shared/state/store'
import { saveJsonFile, openJsonFile } from '@/shared/utils/json'
import { useToast } from '@/shared/hooks/useToast'
import { analyzeDraft, slotToLabel } from '@/shared/utils/assignment'
import { Button } from '@/shared/components/ui/Button'
import { Panel } from '@/shared/components/ui/Panel'

export default function AssignPage() {
	const finalize = useAppStore((s) => s.finalizeCurrentWeek)
	const setDraft = useAppStore((s) => s.setDraft)
	const exportData = useAppStore((s) => s.exportData)
	const importData = useAppStore((s) => s.importData)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const draft = useAppStore((s) => s.currentDraft)
	const warnings = useAppStore((s) => s.warnings)
	const toast = useToast()

	const [isSuggestionOpen, setIsSuggestionOpen] = useState(false)

	function buildFileName(dateISO?: string): string | undefined {
		if (!dateISO) return undefined
		const [year, month, day] = dateISO.split('-')
		if (!year || !month || !day) return undefined
		const compact = `${year.slice(-2)}${month}${day}`
		return `${compact}_Position_data`
	}

	return (
		<div className="col" style={{ gap: 16 }}>
			<Panel style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
				<div className="muted" style={{ fontSize: '0.9375rem' }}>드래그 앤 드롭으로 배정하세요. 저장은 JSON 내보내기/불러오기를 사용합니다.</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<Button
						variant="ghost"
						icon="auto_fix"
						onClick={() => setIsSuggestionOpen(true)}
						style={{ color: 'var(--color-accent)' }}
					>
						AI 제안
					</Button>
					<div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 4px' }} />
					<Button
						variant="secondary"
						icon="upload"
						onClick={async () => {
							const data = await openJsonFile()
							if (data) {
								importData(data)
								toast({
									kind: 'success',
									title: '데이터를 불러왔어요',
									description: `총 ${Object.keys(data.weeks).length}주 기록과 팀원 ${data.members.length}명이 로드되었습니다.`
								})
							} else {
								toast({
									kind: 'info',
									title: '파일이 선택되지 않았어요',
									description: 'JSON 파일을 다시 선택하거나 불러오기를 취소해도 괜찮습니다.'
								})
							}
						}}
					>
						JSON 불러오기
					</Button>
					<Button
						variant="secondary"
						icon="download"
						onClick={async () => {
							const success = await saveJsonFile(exportData(), buildFileName(currentWeekDate))
							if (success) {
								toast({
									kind: 'success',
									title: 'JSON으로 내보냈어요',
									description: '안전하게 백업해두면 확정/취소가 훨씬 쉬워집니다.'
								})
							} else {
								toast({
									kind: 'error',
									title: '내보내지 못했어요',
									description: '파일 저장 권한을 확인하거나 다시 시도해주세요.'
								})
							}
						}}
					>
						JSON 내보내기
					</Button>
					<Button
						variant="primary"
						icon="check"
						onClick={() => {
							const { emptySlots } = analyzeDraft(draft)
							const previewSlots = emptySlots.slice(0, 3).map((slot) => slotToLabel(slot)).join(', ')
							const extraSlots = emptySlots.length > 3 ? ` 외 ${emptySlots.length - 3}개` : ''
							if (emptySlots.length > 0) {
								const proceed = typeof window === 'undefined'
									? true
									: window.confirm(
										[
											`미배정 역할이 ${emptySlots.length}개 남아 있습니다.`,
											previewSlots ? `미배정: ${previewSlots}${extraSlots}` : '',
											'배정을 마치지 않고도 확정할 수 있습니다. 계속 진행할까요?'
										].filter(Boolean).join('\n')
									)
								if (!proceed) {
									toast({
										kind: 'warning',
										title: '확정이 취소되었어요',
										description: '필요한 역할을 채운 뒤 다시 확정해주세요.'
									})
									return
								}
							}
							if (warnings.length > 0) {
								const proceed = typeof window === 'undefined'
									? true
									: window.confirm(`경고 ${warnings.length}건이 남아 있습니다. 현재 상태로 확정할까요?`)
								if (!proceed) {
									toast({
										kind: 'warning',
										title: '확정이 취소되었어요',
										description: '경고를 검토한 뒤 다시 시도해주세요.'
									})
									return
								}
							}
							finalize()
							toast({
								kind: 'success',
								title: '이번 주 배정을 저장했습니다',
								description: 'JSON 내보내기로 백업해 두면 더 안전하게 관리할 수 있어요.'
							})
						}}
					>
						이번 주 확정
					</Button>
				</div>
			</Panel>
			<AssignmentBoard />
			
			<SuggestionModal
				isOpen={isSuggestionOpen}
				onClose={() => setIsSuggestionOpen(false)}
				onApply={(part1, part2) => {
					setDraft({ part1, part2 })
					toast({
						kind: 'success',
						title: '제안을 적용했습니다',
						description: '결과를 확인하고 필요한 경우 수정해주세요.'
					})
				}}
			/>
		</div>
	)
}
