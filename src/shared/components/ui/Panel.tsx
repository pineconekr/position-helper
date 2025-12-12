import React from 'react';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
	({ className, children, ...props }, ref) => {
		const classes = ['panel', className].filter(Boolean).join(' ');
		return (
			<div ref={ref} className={classes} {...props}>
				{children}
			</div>
		);
	}
);

Panel.displayName = 'Panel';

