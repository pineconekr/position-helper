'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/shared/state/store';
import { initSchema, seedFromLocalJson } from '@/shared/lib/db-actions';

export function DbSyncProvider({ children }: { children: React.ReactNode }) {
    const loadFromDb = useAppStore((state) => state.loadFromDb);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
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

    if (!isInitialized) {
        return (
            <div className="fixed inset-0 bg-[var(--color-canvas)] flex items-center justify-center z-[9999]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[14px] font-medium text-[var(--color-label-secondary)]">데이터베이스 연결 중...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
