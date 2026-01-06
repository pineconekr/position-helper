'use client'

import { useState } from 'react'
import AssignmentBoard from '@/features/assignment/components/AssignmentBoard'

import { useAppStore } from '@/shared/state/store'
import { saveJsonFile, openJsonFile } from '@/shared/utils/json'
import { useToast } from '@/shared/hooks/useToast'
import { analyzeDraft, slotToLabel } from '@/shared/utils/assignment'
import { Button } from '@/shared/components/ui/Button'
import { Panel } from '@/shared/components/ui/Panel'
import Icon from '@/shared/components/ui/Icon'
import clsx from 'clsx'

export default function AssignPage() {
    const finalize = useAppStore((s) => s.finalizeCurrentWeek)
    const setDraft = useAppStore((s) => s.setDraft)
    const exportData = useAppStore((s) => s.exportData)
    const importData = useAppStore((s) => s.importData)
    const currentWeekDate = useAppStore((s) => s.currentWeekDate)
    const draft = useAppStore((s) => s.currentDraft)
    const warnings = useAppStore((s) => s.warnings)
    const { toast } = useToast()



    function buildFileName(dateISO?: string): string {
        if (!dateISO) return 'Position_data' // Fallback name
        const [year, month, day] = dateISO.split('-')
        if (!year || !month || !day) return 'Position_data'
        const compact = `${year.slice(-2)}${month}${day}`
        return `${compact}_Position_data`
    }

    const handleImport = async () => {
        try {
            const data = await openJsonFile()
            if (data) {
                importData(data)
                toast({
                    kind: 'success',
                    title: '데이터를 불러왔어요',
                    description: `총 ${Object.keys(data.weeks).length}주 기록과 팀원 ${data.members.length}명이 로드되었습니다.`
                })
            } else {
                toast({
                    kind: 'info',
                    title: '파일이 선택되지 않았어요',
                    description: '작업이 취소되었습니다.'
                })
            }
        } catch (error) {
            console.error(error)
            toast({
                kind: 'error',
                title: '불러오기 실패',
                description: '파일 형식이 올바르지 않거나 손상되었습니다.'
            })
        }
    }

    const handleExport = async () => {
        try {
            const fileName = buildFileName(currentWeekDate)
            const success = await saveJsonFile(exportData(), fileName)
            if (success) {
                toast({
                    kind: 'success',
                    title: 'JSON으로 내보냈어요',
                    description: `파일(downloads/${fileName}.json)이 저장되었습니다.`
                })
            } else {
                // saveJsonFile returns false if canceled or failed silently
                toast({
                    kind: 'error',
                    title: '내보내지 못했어요',
                    description: '파일 저장 중 문제가 발생했습니다.'
                })
            }
        } catch (error) {
            console.error(error)
            toast({
                kind: 'error',
                title: '내보내기 오류',
                description: '예기치 않은 오류가 발생했습니다.'
            })
        }
    }

    const handleFinalize = () => {
        const { emptySlots } = analyzeDraft(draft)
        const previewSlots = emptySlots.slice(0, 3).map((slot) => slotToLabel(slot)).join(', ')
        const extraSlots = emptySlots.length > 3 ? ` 외 ${emptySlots.length - 3}개` : ''

        if (emptySlots.length > 0) {
            const proceed = typeof window === 'undefined'
                ? true
                : window.confirm(
                    [
                        `미배정 역할이 ${emptySlots.length}개 남아 있습니다.`,
                        previewSlots ? `미배정: ${previewSlots}${extraSlots}` : '',
                        '배정을 마치지 않고도 확정할 수 있습니다. 계속 진행할까요?'
                    ].filter(Boolean).join('\n')
                )
            if (!proceed) {
                return
            }
        }

        if (warnings.length > 0) {
            const proceed = typeof window === 'undefined'
                ? true
                : window.confirm(`경고 ${warnings.length}건이 남아 있습니다. 현재 상태로 확정할까요?`)
            if (!proceed) {
                return
            }
        }

        finalize()
        toast({
            kind: 'success',
            title: '확정 완료',
            description: '이번 주 배정이 저장되었습니다.'
        })
    }

    return (
        <div className="space-y-5">
            {/* Action Bar */}
            <Panel className="p-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/10 flex items-center justify-center border border-[var(--color-accent)]/20">
                            <Icon name="drag_indicator" size={18} className="text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-[var(--color-label-primary)]">드래그로 배정</div>
                            <div className="text-xs text-[var(--color-label-secondary)]">팀원을 역할 슬롯에 끌어다 놓으세요</div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">


                        <div className="w-px h-5 bg-[var(--color-border-subtle)] mx-1" />

                        <Button variant="outline" size="sm" onClick={() => { handleImport() }}>
                            <Icon name="upload" size={16} />
                            불러오기
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { handleExport() }}>
                            <Icon name="download" size={16} />
                            내보내기
                        </Button>

                        <div className="w-px h-5 bg-[var(--color-border-subtle)] mx-1" />

                        <Button variant="solid" size="sm" onClick={handleFinalize}>
                            <Icon name="check" size={16} />
                            확정
                        </Button>
                    </div>
                </div>
            </Panel>

            {/* Assignment Board */}
            <AssignmentBoard />


        </div>
    )
}
