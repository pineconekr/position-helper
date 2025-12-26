import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'critical' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	icon?: string; // Material symbol name
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'secondary', size = 'md', icon, children, ...props }, ref) => {
		const baseClass = 'btn';
		const variantClass = variant === 'secondary' ? '' : variant;
		// Size support can be added to CSS later.

		const classes = [baseClass, variantClass, className].filter(Boolean).join(' ');

		return (
			<button ref={ref} className={classes} {...props}>
				{icon && <span className="material-symbol" style={{ marginRight: children ? 8 : 0 }}>{icon}</span>}
				{children}
			</button>
		);
	}
);

Button.displayName = 'Button';

