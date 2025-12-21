import { ChartColorToken } from './tokens';

/**
 * Gets the computed CSS variable value from the document root.
 * Useful for passing CSS variable colors to libraries that require hex strings (like Plotly).
 */
export function getCssVar(token: string): string {
	if (typeof document === 'undefined') return '';
	return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

/**
 * Returns the hex color for a given chart data series index (0-5).
 * Cyclic: if index > 5, it wraps around.
 */
export function getDataSeriesColor(index: number): string {
	const i = index % 6;
	const token: ChartColorToken = `--data-series-${i + 1}` as ChartColorToken;
	return getCssVar(token) || fallbackSeriesColor(i);
}

function fallbackSeriesColor(index: number): string {
	const fallbacks = ['#3b82f6', '#06b6d4', '#f97316', '#8b5cf6', '#ec4899', '#6366f1'];
	return fallbacks[index] || '#3b82f6';
}

export function getChartPalette() {
	return {
		grid: getCssVar('--chart-grid') || 'rgba(15, 23, 42, 0.06)',
		axis: getCssVar('--chart-axis') || 'rgba(15, 23, 42, 0.2)',
		positive: getCssVar('--data-positive') || '#10b981',
		negative: getCssVar('--data-negative') || '#ef4444',
		warning: getCssVar('--color-warning') || '#f59e0b',
		neutral: getCssVar('--data-neutral') || '#64748b',
		text: getCssVar('--color-text-muted') || '#64748b',
		surface2: getCssVar('--color-surface-2') || '#f1f5f9',
		border: getCssVar('--color-border-subtle') || '#e2e8f0',
		series: [0, 1, 2, 3, 4, 5].map(getDataSeriesColor),
	};
}
