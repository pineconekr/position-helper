import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Plot from 'react-plotly.js'
import type { CSSProperties } from 'react'

type PlotComponentProps = React.ComponentProps<typeof Plot>

type ResponsivePlotProps = Omit<PlotComponentProps, 'useResizeHandler'> & {
	height?: number
	containerStyle?: CSSProperties
}

export function ResponsivePlot({
	height = 320,
	containerStyle,
	style,
	layout,
	config,
	onInitialized,
	onUpdate,
	...rest
}: ResponsivePlotProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const graphDivRef = useRef<any>(null)
	const frameRef = useRef<number | null>(null)
	const [containerWidth, setContainerWidth] = useState(0)

	// Plotly 타입 의존성 없이도 resize를 보장하기 위해, 런타임에서만 동적으로 Plotly를 로드한다.
	// (plotly.js-dist-min은 설치되어 있으므로 번들에 포함되며, TS 타입 선언이 없어도 any로 처리)
	const ensurePlotly = useMemo(() => {
		let cached: any | null = null
		let inFlight: Promise<any> | null = null
		return () => {
			if (cached) return Promise.resolve(cached)
			if (inFlight) return inFlight
			inFlight = import('plotly.js-dist-min')
				.then((mod: any) => {
					cached = mod?.default ?? mod
					return cached
				})
				.finally(() => {
					inFlight = null
				})
			return inFlight
		}
	}, [])

	const scheduleResize = useCallback(() => {
		if (!graphDivRef.current) return
		if (frameRef.current !== null) {
			cancelAnimationFrame(frameRef.current)
		}
		frameRef.current = requestAnimationFrame(() => {
			frameRef.current = null
			const graphDiv = graphDivRef.current
			if (!graphDiv) return
			ensurePlotly()
				.then((Plotly: any) => {
					Plotly?.Plots?.resize?.(graphDiv)
				})
				.catch(() => {
					// Plotly 로드 실패 시에도 앱이 깨지지 않도록 무시
				})
		})
	}, [ensurePlotly])

	const handleInitialized = useCallback(
		(figure: unknown, graphDiv: unknown) => {
			graphDivRef.current = graphDiv
			scheduleResize()
			// react-plotly.js 타입이 프로젝트에 없을 수도 있어서 안전하게 any로 전달
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return onInitialized?.(figure as any, graphDiv as any)
		},
		[onInitialized, scheduleResize]
	)

	const handleUpdate = useCallback(
		(figure: unknown, graphDiv: unknown) => {
			graphDivRef.current = graphDiv
			scheduleResize()
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			onUpdate?.(figure as any, graphDiv as any)
		},
		[onUpdate, scheduleResize]
	)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const updateSize = () => {
			const nextWidth = containerRef.current?.clientWidth ?? 0
			setContainerWidth((prev) => (prev === nextWidth ? prev : nextWidth))
			// layout.width 변경과 별개로 Plotly resize를 명시적으로 예약
			scheduleResize()
		}

		updateSize()

		let observer: ResizeObserver | undefined
		if (typeof ResizeObserver === 'function') {
			observer = new ResizeObserver(updateSize)
			observer.observe(container)
		}

		const handleWindowResize = () => updateSize()
		window.addEventListener('resize', handleWindowResize)

		return () => {
			observer?.disconnect()
			window.removeEventListener('resize', handleWindowResize)
			if (frameRef.current !== null) {
				cancelAnimationFrame(frameRef.current)
				frameRef.current = null
			}
		}
	}, [scheduleResize])

	useEffect(() => {
		scheduleResize()
	}, [height, scheduleResize])

	const mergedLayout = useMemo(() => ({
		...layout,
		autosize: false,
		height,
		width: containerWidth || undefined
	}), [layout, height, containerWidth])

	const mergedConfig = useMemo(() => ({
		...config,
		responsive: true
	}), [config])

	const mergedStyle = useMemo(() => ({
		width: '100%',
		height: '100%',
		...style
	}), [style])

	const mergedContainerStyle = useMemo<CSSProperties>(() => ({
		position: 'relative',
		width: '100%',
		height,
		minHeight: height,
		overflow: 'hidden',
		isolation: 'isolate' as const,
		display: 'flex',
		flexDirection: 'column' as const,
		...containerStyle
	}), [height, containerStyle])

	return (
		<div ref={containerRef} style={mergedContainerStyle}>
			<Plot
				{...rest}
				layout={mergedLayout}
				config={mergedConfig}
				style={mergedStyle}
				onInitialized={handleInitialized}
				onUpdate={handleUpdate}
				useResizeHandler={false}
			/>
		</div>
	)
}

