import AssignmentBoard from '../components/assignment/AssignmentBoard'
import { useAppStore } from '../state/store'
import { saveJsonFile, openJsonFile } from '../utils/json'

export default function Assign() {
	const finalize = useAppStore((s) => s.finalizeCurrentWeek)
	const exportData = useAppStore((s) => s.exportData)
	const importData = useAppStore((s) => s.importData)
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)

	function buildFileName(dateISO?: string): string | undefined {
		if (!dateISO) return undefined
		const [year, month, day] = dateISO.split('-')
		if (!year || !month || !day) return undefined
		const compact = `${year.slice(-2)}${month}${day}`
		return `${compact}_Position_data`
	}

	return (
		<div className="col" style={{ gap: 16 }}>
			<div className="toolbar">
				<div className="muted">드래그 앤 드롭으로 배정하세요. 저장은 JSON 내보내기/불러오기를 사용합니다.</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<button className="btn" onClick={async () => { const d = await openJsonFile(); if (d) importData(d) }}>JSON 불러오기</button>
					<button className="btn" onClick={async () => { await saveJsonFile(exportData(), buildFileName(currentWeekDate)) }}>JSON 내보내기</button>
					<button className="btn primary" onClick={() => finalize()}>이번 주 확정</button>
				</div>
			</div>
			<AssignmentBoard />
		</div>
	)
}


