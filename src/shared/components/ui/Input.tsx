import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, style, ...props }, ref) => {
		const defaultStyle: React.CSSProperties = {
			padding: '8px 12px',
			borderRadius: 'var(--radius-md)',
			border: '1px solid var(--color-border-subtle)',
			background: 'var(--color-surface-1)',
			color: 'var(--color-text-primary)',
			fontSize: '0.9375rem',
			width: '100%',
			outline: 'none',
			transition: 'border-color var(--motion-duration-fast) var(--motion-ease-default), box-shadow var(--motion-duration-fast) var(--motion-ease-default)',
		};

		return (
			<input 
				ref={ref} 
				style={{ ...defaultStyle, ...style }} 
				className={className}
				onFocus={(e) => {
					e.target.style.borderColor = 'var(--color-accent)';
					e.target.style.boxShadow = 'var(--focus-ring)';
					props.onFocus?.(e);
				}}
				onBlur={(e) => {
					e.target.style.borderColor = 'var(--color-border-subtle)';
					e.target.style.boxShadow = 'none';
					props.onBlur?.(e);
				}}
				{...props} 
			/>
		);
	}
);

Input.displayName = 'Input';

