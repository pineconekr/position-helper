import RoleCell from './RoleCell'
import type { RoleKey } from '@/shared/types'

type Props = {
	onSlotClick: (part: 'part1' | 'part2', role: RoleKey, index?: 0 | 1) => void
}

export default function AssignmentTable({ onSlotClick }: Props) {
	return (
		<div className="assignment-table-wrapper" style={{ marginBottom: 24 }}>
			<table className="table assignment-table">
				<thead>
					<tr>
						<th>부</th>
						<th>SW</th>
						<th>자막</th>
						<th>고정</th>
						<th>사이드</th>
						<th>스케치</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>1부</td>
						<td data-label="SW"><RoleCell part="part1" role="SW" onSlotClick={onSlotClick} /></td>
						<td data-label="자막"><RoleCell part="part1" role="자막" onSlotClick={onSlotClick} /></td>
						<td data-label="고정"><RoleCell part="part1" role="고정" onSlotClick={onSlotClick} /></td>
						<td data-label="사이드" className="role-cell-group">
							<RoleCell part="part1" role="사이드" index={0} onSlotClick={onSlotClick} />
							<RoleCell part="part1" role="사이드" index={1} onSlotClick={onSlotClick} />
						</td>
						<td data-label="스케치"><RoleCell part="part1" role="스케치" onSlotClick={onSlotClick} /></td>
					</tr>
					<tr>
						<td>2부</td>
						<td data-label="SW"><RoleCell part="part2" role="SW" onSlotClick={onSlotClick} /></td>
						<td data-label="자막"><RoleCell part="part2" role="자막" onSlotClick={onSlotClick} /></td>
						<td data-label="고정"><RoleCell part="part2" role="고정" onSlotClick={onSlotClick} /></td>
						<td data-label="사이드" className="role-cell-group">
							<RoleCell part="part2" role="사이드" index={0} onSlotClick={onSlotClick} />
							<RoleCell part="part2" role="사이드" index={1} onSlotClick={onSlotClick} />
						</td>
						<td data-label="스케치"><RoleCell part="part2" role="스케치" onSlotClick={onSlotClick} /></td>
					</tr>
				</tbody>
			</table>
		</div>
	)
}
