import React, { useEffect } from 'react';
import { useAppStore } from '../state/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const theme = useAppStore((s) => s.theme);

	// Sync effect for system preference and theme changes
	useEffect(() => {
		const applyTheme = () => {
			let effectiveTheme = theme;
			if (theme === 'system') {
				const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				effectiveTheme = isDark ? 'dark' : 'light';
			}
			document.documentElement.setAttribute('data-theme', effectiveTheme);
		};

		applyTheme();

		if (theme === 'system') {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', applyTheme);
			return () => mediaQuery.removeEventListener('change', applyTheme);
		}
	}, [theme]);

	return <>{children}</>;
}

export function useTheme() {
	const theme = useAppStore((s) => s.theme);
	const getEffectiveTheme = useAppStore((s) => s.getEffectiveTheme);
	const setTheme = useAppStore((s) => s.setTheme);

	const toggleTheme = () => {
		const current = getEffectiveTheme();
		const next = current === 'light' ? 'dark' : 'light';
		setTheme(next);
	};

	return { 
		theme, 
		effectiveTheme: getEffectiveTheme(), 
		setTheme, 
		toggleTheme 
	};
}
