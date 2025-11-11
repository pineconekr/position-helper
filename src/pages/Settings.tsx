import { useAppStore } from '../state/store'

export default function Settings() {
	const theme = useAppStore((s) => s.theme)
	const setTheme = useAppStore((s) => s.setTheme)
	const effectiveTheme = useAppStore((s) => s.getEffectiveTheme())
	return (
		<div className="panel" style={{ padding: 12 }}>
			<h3 style={{ marginTop: 0 }}>설정</h3>
			<div className="row">
				<div className="col">
					<label>테마</label>
					<div className="col" style={{ gap: 8 }}>
						<label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
							<input type="radio" name="theme" value="system" checked={theme === 'system'} onChange={() => setTheme('system')} />
							<span>시스템 설정 따르기 {theme === 'system' && `(${effectiveTheme === 'dark' ? '다크' : '라이트'})`}</span>
						</label>
						<label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
							<input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} />
							<span>라이트 모드</span>
						</label>
						<label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
							<input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} />
							<span>다크 모드</span>
						</label>
					</div>
					<div className="muted" style={{ marginTop: 8 }}>상단 헤더의 이모지 버튼으로도 빠르게 전환할 수 있습니다.</div>
				</div>
			</div>
		</div>
	)
}


