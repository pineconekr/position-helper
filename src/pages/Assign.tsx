import AssignmentBoard from '../components/assignment/AssignmentBoard'
import { useAppStore } from '../state/store'
import { saveJsonFile, openJsonFile } from '../utils/json'
import { useToast } from '../hooks/useToast'
import { analyzeDraft } from '../utils/assignment'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'

export default function Assign() {
	const finalize = useAppStore((s) => s.finalizeCurrentWeek)
	const exportData = useAppStore((s) => s.exportData)
	const importData = useAppStore((s) => s.importData)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const draft = useAppStore((s) => s.currentDraft)
	const warnings = useAppStore((s) => s.warnings)
	const toast = useToast()

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
							if (emptySlots.length > 0) {
								toast({
									kind: 'warning',
									title: '미배정 역할이 남아있어요',
									description: `${emptySlots.length}개 역할을 모두 채운 뒤 확정해주세요.`
								})
								return
							}
							if (warnings.length > 0) {
								const proceed = typeof window === 'undefined'
									? true
									: window.confirm(`경고 ${warnings.length}건이 남아 있습니다. 그래도 확정할까요?`)
								if (!proceed) {
									toast({
										kind: 'warning',
										title: '경고 해결 후 확정해주세요',
										description: `경고를 해결하면 더 안정적으로 확정할 수 있습니다.`
									})
									return
								}
							}
							finalize()
						}}
					>
						이번 주 확정
					</Button>
				</div>
			</Panel>
			<AssignmentBoard />
		</div>
	)
}
