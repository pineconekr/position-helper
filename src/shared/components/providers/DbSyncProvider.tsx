'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/shared/state/store';
import { initSchema, seedFromLocalJson } from '@/shared/lib/db-actions';

/**
 * DbSyncProvider - 비동기 DB 동기화 (논블로킹)
 * 
 * LCP 최적화: 초기화 중에도 children을 렌더링하여 페이지 표시를 차단하지 않음
 * 초기화 중에는 오버레이 로딩 인디케이터만 표시
 */
export function DbSyncProvider({ children }: { children: React.ReactNode }) {
    const loadFromDb = useAppStore((state) => state.loadFromDb);
    const [isInitialized, setIsInitialized] = useState(false);
    const initStarted = useRef(false);

    useEffect(() => {
        // 중복 초기화 방지
        if (initStarted.current) return;
        initStarted.current = true;

        const init = async () => {
            try {
                // 1. Schema 초기화 및 시딩 (서버 사이드에서 체크함)
                await initSchema();
                const seedResult = await seedFromLocalJson();
                console.log('DB Seed Result:', seedResult.message);

                // 2. 데이터 불러오기
                await loadFromDb();
                setIsInitialized(true);
            } catch (error) {
                console.error('Failed to initialize DB sync:', error);
                // 에러가 나도 우선 로컬 데이터로 작동하게 함
                setIsInitialized(true);
            }
        };

        init();
    }, [loadFromDb]);

    return (
        <>
            {/* 항상 children 렌더링 (LCP 차단 방지) */}
            {children}

            {/* 초기화 중일 때만 오버레이 표시 */}
            {!isInitialized && (
                <div
                    className="fixed inset-0 bg-[var(--color-canvas)]/80 backdrop-blur-sm flex items-center justify-center z-[9999] transition-opacity"
                    style={{ pointerEvents: 'none' }}
                >
                    <div className="flex flex-col items-center gap-4 bg-[var(--color-surface-elevated)] rounded-xl p-6 shadow-lg border border-[var(--color-border-subtle)]">
                        <div className="w-8 h-8 border-3 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium text-[var(--color-label-secondary)]">데이터 동기화 중...</p>
                    </div>
                </div>
            )}
        </>
    );
}
