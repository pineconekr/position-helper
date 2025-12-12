import React from 'react';

type BadgeVariant = 'neutral' | 'accent' | 'critical' | 'success' | 'warning';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant = 'neutral', children, ...props }, ref) => {
		const baseClass = 'badge';
		const variantClass = variant === 'neutral' ? '' : variant;
		const classes = [baseClass, variantClass, className].filter(Boolean).join(' ');

		return (
			<span ref={ref} className={classes} {...props}>
				{children}
			</span>
		);
	}
);

Badge.displayName = 'Badge';

