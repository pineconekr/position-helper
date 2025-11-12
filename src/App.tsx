import { NavLink, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import Assign from './pages/Assign'
import Stats from './pages/Stats'
import Members from './pages/Members'
import Settings from './pages/Settings'
import ThemeToggle from './components/common/ThemeToggle'
import ToastCenter from './components/common/ToastCenter'
import { useAppStore } from './state/store'
import './theme/theme.css'

export default function App() {
	const theme = useAppStore((s) => s.theme)
	const getEffectiveTheme = useAppStore((s) => s.getEffectiveTheme)
	
	useEffect(() => {
		// 초기 테마 적용
		const effective = getEffectiveTheme()
		document.documentElement.setAttribute('data-theme', effective)
		
		// 시스템 설정 변경 감지 (system 모드일 때만)
		if (theme === 'system' && typeof window !== 'undefined') {
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
			const handler = () => {
				const newEffective = getEffectiveTheme()
				document.documentElement.setAttribute('data-theme', newEffective)
			}
			mediaQuery.addEventListener('change', handler)
			return () => mediaQuery.removeEventListener('change', handler)
		}
	}, [theme, getEffectiveTheme])
	
	return (
		<div className="app-shell">
			<header className="app-header">
				<div className="brand">📸 Position Helper</div>
				<nav className="nav">
					<NavLink to="/" end>배정</NavLink>
					<NavLink to="/stats">통계</NavLink>
					<NavLink to="/members">팀원</NavLink>
					<NavLink to="/settings">설정</NavLink>
				</nav>
				<ThemeToggle />
			</header>
			<main className="app-main">
				<div className="app-main__page">
					<Routes>
						<Route path="/" element={<Assign />} />
						<Route path="/stats" element={<Stats />} />
						<Route path="/members" element={<Members />} />
						<Route path="/settings" element={<Settings />} />
					</Routes>
				</div>
			</main>
			<ToastCenter />
		</div>
	)
}


