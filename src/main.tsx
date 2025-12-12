import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/app/App'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import '@/shared/theme/theme.css'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
	<React.StrictMode>
		<BrowserRouter>
			<ThemeProvider>
				<App />
			</ThemeProvider>
		</BrowserRouter>
	</React.StrictMode>
)
