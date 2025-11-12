import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Assign from './pages/Assign'
import Stats from './pages/Stats'
import Members from './pages/Members'
import Settings from './pages/Settings'
import ThemeToggle from './components/common/ThemeToggle'
import ToastCenter from './components/common/ToastCenter'
import { useAppStore } from './state/store'
import './theme/theme.css'
import { motionDur, motionEase, useShouldReduceMotion } from './utils/motion'

export default function App() {
	const theme = useAppStore((s) => s.theme)
	const getEffectiveTheme = useAppStore((s) => s.getEffectiveTheme)
	const location = useLocation()
	const prefersReducedMotion = useShouldReduceMotion()
	const pageVariants = prefersReducedMotion
		? {
				initial: { opacity: 1, y: 0 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 1, y: 0, transition: { duration: 0 } }
			}
			: {
				initial: { opacity: 0, y: 8, transition: { duration: motionDur.page, ease: motionEase.inOut } },
				animate: { opacity: 1, y: 0, transition: { duration: motionDur.page, ease: motionEase.inOut } },
				exit: { opacity: 0, y: -8, transition: { duration: motionDur.medium, ease: motionEase.in } }
			}
	
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
					<AnimatePresence initial={false}>
						<motion.div
							key={location.pathname}
							variants={pageVariants}
							initial="initial"
							animate="animate"
							exit="exit"
							style={{ width: '100%' }}
						>
							<Routes location={location}>
								<Route path="/" element={<Assign />} />
								<Route path="/stats" element={<Stats />} />
								<Route path="/members" element={<Members />} />
								<Route path="/settings" element={<Settings />} />
							</Routes>
						</motion.div>
					</AnimatePresence>
				</div>
			</main>
			<ToastCenter />
		</div>
	)
}


