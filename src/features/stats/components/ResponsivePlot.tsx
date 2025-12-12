import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Plot from 'react-plotly.js'
import Plotly from 'plotly.js-dist-min'
import type { PlotParams } from 'react-plotly.js'
import type { CSSProperties } from 'react'

type ResponsivePlotProps = Omit<PlotParams, 'useResizeHandler'> & {
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
	const plotRef = useRef<Plotly.PlotlyHTMLElement | null>(null)
	const frameRef = useRef<number | null>(null)
	const [containerWidth, setContainerWidth] = useState(0)

	const scheduleResize = useCallback(() => {
		if (!plotRef.current) return
		if (frameRef.current !== null) {
			cancelAnimationFrame(frameRef.current)
		}
		frameRef.current = requestAnimationFrame(() => {
			frameRef.current = null
			if (!plotRef.current) return
			Plotly.Plots.resize(plotRef.current)
		})
	}, [])

	const handleInitialized = useCallback<NonNullable<PlotParams['onInitialized']>>(
		(figure, graphDiv) => {
			plotRef.current = graphDiv
			scheduleResize()
			if (onInitialized) {
				return onInitialized(figure, graphDiv)
			}
			return graphDiv
		},
		[onInitialized, scheduleResize]
	)

	const handleUpdate = useCallback<NonNullable<PlotParams['onUpdate']>>(
		(figure, graphDiv) => {
			plotRef.current = graphDiv
			scheduleResize()
			onUpdate?.(figure, graphDiv)
		},
		[onUpdate, scheduleResize]
	)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const updateSize = () => {
			const nextWidth = containerRef.current?.clientWidth ?? 0
			setContainerWidth((prev) => (prev === nextWidth ? prev : nextWidth))
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

	const mergedContainerStyle = useMemo(() => ({
		position: 'relative',
		width: '100%',
		height,
		minHeight: height,
		overflow: 'hidden',
		isolation: 'isolate',
		display: 'flex',
		flexDirection: 'column',
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

