import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Assign from './pages/Assign'
import Stats from './pages/Stats'
import Members from './pages/Members'
import Settings from './pages/Settings'
import ThemeToggle from './components/common/ThemeToggle'
import ToastCenter from './components/common/ToastCenter'
import './theme/theme.css'
import { useMotionConfig } from './utils/motion'

export default function App() {
	const location = useLocation()
	const { duration, ease, shouldReduce } = useMotionConfig()
	const reducedState = { opacity: 1, y: 0, transition: { duration: 0 } }
	const pageVariants = shouldReduce
		? {
			initial: reducedState,
			animate: reducedState,
			exit: reducedState
		}
		: {
			initial: { opacity: 0, y: 8 },
			animate: {
				opacity: 1,
				y: 0,
				transition: { duration: duration.page, ease: ease.default }
			},
			exit: {
				opacity: 0,
				y: -8,
				transition: { duration: duration.normal, ease: ease.in }
			}
		}
	
	return (
		<div className="app-shell">
			<header className="app-header">
				<div className="brand">
					<span className="material-symbol" aria-hidden="true">photo_camera</span>
					<span> Position Helper</span>
				</div>
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
					<AnimatePresence initial={false} mode="wait">
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


