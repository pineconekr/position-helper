import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, style, ...props }, ref) => {
		const defaultStyle: React.CSSProperties = {
			padding: '10px 12px',
			borderRadius: 'var(--radius-md)',
			border: '1px solid var(--color-border-subtle)',
			background: 'var(--color-surface-1)',
			color: 'var(--color-text-primary)',
			fontSize: '0.9375rem',
			width: '100%',
			outline: 'none',
			resize: 'vertical',
			minHeight: '100px',
			fontFamily: 'inherit',
			transition: 'border-color var(--motion-duration-fast) var(--motion-ease-default), box-shadow var(--motion-duration-fast) var(--motion-ease-default)',
		};

		return (
			<textarea 
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

Textarea.displayName = 'Textarea';

