import { Badge } from '../ui/Badge'

type Props = { count: number }
export default function WarningBadge({ count }: Props) {
	if (count <= 0) return <Badge variant="success">경고 없음</Badge>
	return <Badge variant="critical">⚠ {count}건</Badge>
}
