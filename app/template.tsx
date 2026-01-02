'use client'

import { m, LazyMotion, domAnimation } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useShouldReduceMotion } from '@/shared/utils/motion'

export default function Template({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const shouldReduce = useShouldReduceMotion()

	// 애니메이션이 비활성화된 경우 바로 렌더링
	if (shouldReduce) {
		return <>{children}</>
	}

	return (
		<LazyMotion features={domAnimation} strict>
			<m.div
				key={pathname}
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ 
					duration: 0.35,
					ease: [0.25, 0.46, 0.45, 0.94]
				}}
				style={{ 
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column'
				}}
			>
				{children}
			</m.div>
		</LazyMotion>
	)
}

