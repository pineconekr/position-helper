type Props = { count: number }
export default function WarningBadge({ count }: Props) {
	if (count <= 0) return <span className="badge">경고 없음</span>
	return <span className="badge danger">⚠ {count}건</span>
}


