import Icon from '@/shared/components/ui/Icon'

interface ChartHelpProps {
    description: string
}

export function ChartHelp({ description }: ChartHelpProps) {
    return (
        <button
            type="button"
            className="chart-help"
            data-tooltip={description}
            aria-label="도움말"
        >
            <Icon name="info" size={16} style={{ color: 'var(--color-text-muted)' }} />
        </button>
    )
}
