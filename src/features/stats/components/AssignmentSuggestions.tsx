'use client'

import React, { useMemo, useState, useCallback } from 'react'
import Icon from '@/shared/components/ui/Icon'
import { useAppStore } from '@/shared/state/store'
import { generateAssignmentPlan, SlotRecommendation, getSlotCandidates, CandidateScore } from '../utils/assignmentSuggestionEngine'
import type { RoleKey } from '@/shared/types'

/**
 * AssignmentSuggestions - 배정 제안
 * 
 * UX/UI 개선 사항 (최종 디테일):
 * 1. 스크롤바: 전역 스타일 적용으로 개별 클래스 불필요
 * 2. 마스크 그라데이션: 상하단 리스트 흐림 효과 (Mask Fade)
 * 3. 점수 정렬: text-right 및 font-mono로 완벽한 숫자 정렬
 * 4. 여백: 스크롤바와 콘텐츠 사이 숨 쉴 공간(pr-2) 확보
 */

const ROLE_LABELS: Record<RoleKey, string> = {
    SW: 'SW',
    자막: '자막',
    고정: '고정',
    사이드: '사이드',
    스케치: '스케치',
}

// 점수 스타일
function getScoreStyle(score: number): { color: string; className?: string } {
    if (score >= 130) return { color: 'var(--color-success)' }
    if (score >= 100) return { color: '#f4f4f5' } // Zinc-100
    if (score >= 70) return { color: 'var(--color-warning)' }
    return { color: 'var(--color-danger)' }
}

// 슬롯 행 컴포넌트
function SlotRow({ rec, onClick }: {
    rec: SlotRecommendation
    onClick: () => void
}) {
    const { slot, recommended } = rec
    const roleLabel = ROLE_LABELS[slot.role] + (slot.index !== undefined ? ` #${slot.index + 1}` : '')
    const scoreStyle = recommended ? getScoreStyle(recommended.score) : null

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                w-full flex items-center gap-2 sm:gap-4 py-3 sm:py-3.5 px-3 sm:px-4 transition-all duration-200 text-left
                hover:bg-[var(--color-surface-elevated)] active:bg-[var(--color-surface)]
                border-b border-[var(--color-border-subtle)]/50 last:border-b-0
                group cursor-pointer
            `}
        >
            {/* 역할명 */}
            <span className="w-16 sm:w-20 text-xs sm:text-sm font-medium text-[var(--color-label-tertiary)] group-hover:text-[var(--color-label-secondary)] transition-colors">
                {roleLabel}
            </span>

            {/* 추천 멤버 또는 후보 없음 */}
            <div className="flex-1 min-w-0">
                {recommended ? (
                    <span className="text-sm font-semibold text-zinc-300 block truncate group-hover:text-zinc-100 transition-colors">
                        {recommended.displayName}
                    </span>
                ) : (
                    <span className="text-sm font-medium text-[var(--color-warning)] flex items-center gap-1.5">
                        <Icon name="warning" size={14} />
                        후보 없음
                    </span>
                )}
            </div>

            {/* 점수 - 정렬 개선 (text-right) */}
            {recommended && scoreStyle && (
                <span
                    className="text-sm font-medium tabular-nums tracking-tight text-right w-8"
                    style={{
                        color: scoreStyle.color,
                        fontFamily: 'var(--font-mono)'
                    }}
                >
                    {recommended.score}
                </span>
            )}

            {/* Chevron */}
            <Icon
                name="chevron_right"
                size={14}
                className="text-[var(--color-label-tertiary)] group-hover:text-[var(--color-label-primary)] transition-colors flex-shrink-0 opacity-50 group-hover:opacity-100 ml-1"
            />
        </button>
    )
}

// 파트별 카드 컴포넌트
function PartCard({
    part,
    slots,
    onSlotClick
}: {
    part: 'part1' | 'part2'
    slots: SlotRecommendation[]
    onSlotClick: (rec: SlotRecommendation) => void
}) {
    const partLabel = part === 'part1' ? '1부' : '2부'
    const issueCount = slots.filter(s => !s.recommended).length

    return (
        <div className="rounded-xl border border-[var(--color-border-subtle)]/50 bg-[var(--color-surface)] overflow-hidden shadow-sm">
            {/* Part Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[var(--color-border-subtle)]/50 bg-[var(--color-surface-elevated)]/50">
                <span className="text-sm font-semibold text-[var(--color-label-primary)]">
                    {partLabel}
                </span>
                {issueCount > 0 && (
                    <span className="text-xs text-[var(--color-warning)] font-medium flex items-center gap-1">
                        {issueCount}개 미배정
                    </span>
                )}
            </div>

            {/* Slot List */}
            <div>
                {slots.map((rec, idx) => (
                    <SlotRow
                        key={`${rec.slot.role}-${rec.slot.index ?? 0}-${idx}`}
                        rec={rec}
                        onClick={() => onSlotClick(rec)}
                    />
                ))}
            </div>
        </div>
    )
}

// 후보자 목록 모달
function CandidatesModal({
    rec,
    allCandidates,
    onClose
}: {
    rec: SlotRecommendation
    allCandidates: CandidateScore[]
    onClose: () => void
}) {
    const { slot, recommended, alternatives } = rec
    const partLabel = slot.part === 'part1' ? '1부' : '2부'
    const roleLabel = ROLE_LABELS[slot.role] + (slot.index !== undefined ? ` #${slot.index + 1}` : '')

    const displayCandidates = recommended
        ? [recommended, ...alternatives]
        : allCandidates

    const isForceAssign = !recommended

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm transition-all"
            onClick={onClose}
        >
            <div
                className="bg-[var(--color-surface-elevated)] rounded-xl border border-[var(--color-border-default)] w-full max-w-md overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]/50 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--color-label-tertiary)] uppercase">{partLabel}</span>
                        <span className="text-base font-bold text-[var(--color-label-primary)]">{roleLabel}</span>
                        {isForceAssign && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-[var(--color-warning)]/20 text-[var(--color-warning)]">
                                강제 배정
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-label-tertiary)] hover:text-[var(--color-label-primary)] transition-colors"
                    >
                        <Icon name="close" size={20} />
                    </button>
                </div>

                {/* Candidates List - 스크롤바 전역 적용됨 */}
                <div className="flex-1 relative overflow-hidden">
                    <div
                        className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto pr-2 pl-2 py-2"
                        style={{
                            maskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)',
                            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15px, black calc(100% - 15px), transparent)'
                        }}
                    >
                        {displayCandidates.length === 0 ? (
                            <div className="py-12 text-center">
                                <Icon name="person_off" size={36} className="text-[var(--color-label-tertiary)]/50 mx-auto mb-3" />
                                <p className="text-sm text-[var(--color-label-secondary)]">
                                    배정 가능한 팀원이 없습니다
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {displayCandidates.map((candidate, idx) => {
                                    const isTop = idx === 0 && !isForceAssign
                                    const scoreStyle = getScoreStyle(candidate.score)

                                    return (
                                        <button
                                            key={candidate.name}
                                            className={`
                                                w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                                                hover:bg-[var(--color-surface)] active:scale-[0.98]
                                                ${isTop ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20' : 'border border-transparent'}
                                            `}
                                        >
                                            {/* 순위 */}
                                            <span className={`
                                                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none flex-shrink-0
                                                ${isTop
                                                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                                    : 'bg-[var(--color-surface)] text-[var(--color-label-tertiary)]'}
                                            `}>
                                                {idx + 1}
                                            </span>

                                            {/* 이름 및 사유 */}
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className={`text-sm font-semibold truncate ${isTop ? 'text-[var(--color-accent-light)]' : 'text-zinc-200'}`}>
                                                    {candidate.displayName}
                                                </p>
                                                {candidate.reasons.length > 0 && (
                                                    <p className="text-xs text-[var(--color-label-tertiary)] mt-0.5 truncate">
                                                        {candidate.reasons.join(' · ')}
                                                    </p>
                                                )}
                                            </div>

                                            {/* 점수 - 정렬 개선 */}
                                            <span
                                                className="text-sm font-bold tabular-nums text-right w-10"
                                                style={{
                                                    color: scoreStyle.color,
                                                    fontFamily: 'var(--font-mono)'
                                                }}
                                            >
                                                {candidate.score}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3.5 border-t border-[var(--color-border-subtle)]/50 bg-[var(--color-surface)]/50 backdrop-blur-sm flex-shrink-0">
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-[var(--color-label-secondary)] font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full ring-2 ring-[var(--color-success)]/20" style={{ background: 'var(--color-success)' }} />
                            130+ 최적
                        </span>
                        <span className="text-[var(--color-border-default)]">|</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full ring-2 ring-zinc-200/20" style={{ background: '#f4f4f5' }} />
                            100+ 적합
                        </span>
                        <span className="text-[var(--color-border-default)]">|</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full ring-2 ring-[var(--color-warning)]/20" style={{ background: 'var(--color-warning)' }} />
                            70+ 주의
                        </span>
                        <span className="text-[var(--color-border-default)]">|</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full ring-2 ring-[var(--color-danger)]/20" style={{ background: 'var(--color-danger)' }} />
                            70- 비추천
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function AssignmentSuggestions() {
    const app = useAppStore((s) => s.app)

    const absentees = useMemo(() => {
        return []
    }, [])

    const plan = useMemo(() => generateAssignmentPlan(app, absentees), [app, absentees])

    const [selectedSlot, setSelectedSlot] = useState<SlotRecommendation | null>(null)

    const allCandidatesForSlot = useMemo(() => {
        if (!selectedSlot) return []
        return getSlotCandidates(app, selectedSlot.slot, absentees, [])
    }, [app, selectedSlot, absentees])

    // TODO: 전체 배정 적용 기능 (보류)
    // const handleApplyAll = useCallback(() => {
    //     console.log('Apply all recommendations:', plan.slots)
    // }, [plan.slots])

    // Group by part
    const part1Slots = plan.slots.filter(s => s.slot.part === 'part1')
    const part2Slots = plan.slots.filter(s => s.slot.part === 'part2')

    const hasWarnings = plan.summary.warnings.length > 0
    const totalIssues = plan.slots.filter(s => !s.recommended).length

    return (
        <div className="flex flex-col h-full font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-5 flex-shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-[var(--color-label-primary)] tracking-tight">
                        배정 제안
                    </h2>
                    <p className="text-xs text-[var(--color-label-tertiary)] mt-1 flex items-center gap-2">
                        <span className="font-medium bg-[var(--color-surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--color-border-subtle)] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                            {plan.summary.filledCount}/{plan.summary.totalSlots}
                        </span>
                        <span>슬롯 배정됨</span>
                        {totalIssues > 0 && (
                            <span className="text-[var(--color-warning)] font-semibold flex items-center gap-1">
                                — {totalIssues}개 미배정
                            </span>
                        )}
                    </p>
                </div>
                {/* TODO: 전체 적용 버튼 (보류) */}
                {/* <button
                    // onClick={handleApplyAll}
                    className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                    <Icon name="auto_fix" size={16} />
                    전체 적용
                </button> */}
            </div>

            {/* Warning Banner */}
            {hasWarnings && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 shadow-sm flex-shrink-0">
                    <p className="text-xs text-[var(--color-warning)] font-semibold flex items-center gap-2">
                        <Icon name="warning" size={18} />
                        {plan.summary.warnings.length}개 슬롯에 적합한 후보가 없습니다. 확인이 필요합니다.
                    </p>
                </div>
            )}

            {/* Part Cards */}
            <div className="flex-1 space-y-4 sm:space-y-5 overflow-y-auto pb-4 pr-1">
                <PartCard
                    part="part1"
                    slots={part1Slots}
                    onSlotClick={setSelectedSlot}
                />
                <PartCard
                    part="part2"
                    slots={part2Slots}
                    onSlotClick={setSelectedSlot}
                />
            </div>

            {/* Candidates Modal */}
            {selectedSlot && (
                <CandidatesModal
                    rec={selectedSlot}
                    allCandidates={allCandidatesForSlot}
                    onClose={() => setSelectedSlot(null)}
                />
            )}
        </div>
    )
}
