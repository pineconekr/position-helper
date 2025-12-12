export type ColorToken =
	| '--color-canvas'
	| '--color-surface-1'
	| '--color-surface-2'
	| '--color-surface-overlay'
	| '--color-text-primary'
	| '--color-text-muted'
	| '--color-text-subtle'
	| '--color-text-inverse'
	| '--color-text-on-accent'
	| '--color-text-on-critical'
	| '--color-accent'
	| '--color-accent-soft'
	| '--color-critical'
	| '--color-critical-soft'
	| '--color-success'
	| '--color-success-soft'
	| '--color-warning'
	| '--color-warning-soft'
	| '--color-border-subtle'
	| '--color-border-strong'
	| '--color-overlay';

export type ShadowToken =
	| '--shadow-sm'
	| '--shadow-md'
	| '--shadow-lg';

export type MotionToken =
	| '--motion-duration-fast'
	| '--motion-duration-normal'
	| '--motion-duration-slow'
	| '--motion-duration-quick'
	| '--motion-duration-medium'
	| '--motion-ease-default'
	| '--motion-ease-in'
	| '--motion-ease-out'
	| '--motion-ease-standard';

export type ChartColorToken =
	| '--data-series-1'
	| '--data-series-2'
	| '--data-series-3'
	| '--data-series-4'
	| '--data-series-5'
	| '--data-series-6'
	| '--data-positive'
	| '--data-negative'
	| '--data-neutral'
	| '--chart-grid'
	| '--chart-axis';

export type ThemeName = 'light' | 'dark';

export const tokens = {
	color: {
		canvas: 'var(--color-canvas)',
		surface1: 'var(--color-surface-1)',
		surface2: 'var(--color-surface-2)',
		overlay: 'var(--color-surface-overlay)',
		textPrimary: 'var(--color-text-primary)',
		textMuted: 'var(--color-text-muted)',
		textSubtle: 'var(--color-text-subtle)',
		textInverse: 'var(--color-text-inverse)',
		textOnAccent: 'var(--color-text-on-accent)',
		accent: 'var(--color-accent)',
		accentSoft: 'var(--color-accent-soft)',
		critical: 'var(--color-critical)',
		criticalSoft: 'var(--color-critical-soft)',
		success: 'var(--color-success)',
		successSoft: 'var(--color-success-soft)',
		warning: 'var(--color-warning)',
		warningSoft: 'var(--color-warning-soft)',
		borderSubtle: 'var(--color-border-subtle)',
		borderStrong: 'var(--color-border-strong)',
	},
	shadow: {
		sm: 'var(--shadow-sm)',
		md: 'var(--shadow-md)',
		lg: 'var(--shadow-lg)',
	},
	motion: {
		fast: 'var(--motion-duration-fast)',
		normal: 'var(--motion-duration-normal)',
		slow: 'var(--motion-duration-slow)',
		easeDefault: 'var(--motion-ease-default)',
		easeIn: 'var(--motion-ease-in)',
		easeOut: 'var(--motion-ease-out)',
		// Legacy aliases
		quick: 'var(--motion-duration-quick)',
		medium: 'var(--motion-duration-medium)',
		ease: 'var(--motion-ease-standard)',
	}
} as const;
