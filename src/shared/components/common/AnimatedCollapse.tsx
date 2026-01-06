'use client'

import { ReactNode } from 'react'
import { AnimatePresence, m, LazyMotion, domAnimation } from 'framer-motion'
import { useShouldReduceMotion } from '@/shared/utils/motion'

type AnimatedCollapseProps = {
    /**
     * 표시 여부
     */
    isOpen: boolean
    /**
     * 자식 컴포넌트
     */
    children: ReactNode
    /**
     * 애니메이션 키 (탭 전환 등에서 사용)
     */
    animationKey?: string
    /**
     * 애니메이션 유형
     * - 'height': 높이 변화 (접기/펼치기)
     * - 'fade': 페이드 인/아웃
     */
    variant?: 'height' | 'fade'
    /**
     * 래퍼 클래스명
     */
    className?: string
}

const heightAnimation = {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { type: 'spring' as const, stiffness: 400, damping: 35 }
}

const fadeAnimation = {
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    transition: { duration: 0.15 }
}

/**
 * 모션 감소 설정을 존중하는 애니메이션 컨테이너
 * 
 * - prefers-reduced-motion이 활성화되면 애니메이션 없이 렌더링
 * - LazyMotion을 사용하여 framer-motion 번들 크기 최적화
 */
export function AnimatedCollapse({
    isOpen,
    children,
    animationKey = 'content',
    variant = 'height',
    className = 'overflow-hidden'
}: AnimatedCollapseProps) {
    const shouldReduce = useShouldReduceMotion()
    const animation = variant === 'height' ? heightAnimation : fadeAnimation

    // 모션 감소 모드: 애니메이션 없이 즉시 표시/숨김
    if (shouldReduce) {
        if (!isOpen) return null
        return <div className={className}>{children}</div>
    }

    // 일반 모드: 애니메이션 적용
    return (
        <LazyMotion features={domAnimation} strict>
            <AnimatePresence mode="wait" initial={false}>
                {isOpen && (
                    <m.div
                        key={animationKey}
                        initial={animation.initial}
                        animate={animation.animate}
                        exit={animation.exit}
                        transition={animation.transition}
                        className={className}
                    >
                        {children}
                    </m.div>
                )}
            </AnimatePresence>
        </LazyMotion>
    )
}
