'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'
import type { RoleKey } from '@/shared/types'
import { RoleKeys } from '@/shared/types'
import { BLANK_ROLE_VALUE, stripCohort } from '@/shared/utils/assignment'
import { encodeDropId, encodeAssignedId } from '@/shared/utils/dndIds'
import { useAppStore } from '@/shared/state/store'
import Icon from '@/shared/components/ui/Icon'
import { PartKey } from '../utils/slotValidation'
import clsx from 'clsx'

const ROLE_COUNTS: Record<RoleKey, number> = {
    SW: 1,
    자막: 1,
    고정: 1,
    사이드: 2,
    스케치: 1,
}

const ROLE_COLORS: Record<RoleKey, string> = {
    SW: 'text-violet-600 dark:text-violet-400',
    자막: 'text-amber-600 dark:text-amber-400',
    고정: 'text-emerald-600 dark:text-emerald-400',
    사이드: 'text-sky-600 dark:text-sky-400',
    스케치: 'text-rose-500 dark:text-rose-400',
}

type SlotKey = `${PartKey}-${RoleKey}` | `${PartKey}-${RoleKey}-${0 | 1}`

type RoleCellProps = {
    part: PartKey
    role: RoleKey
    index?: 0 | 1
    value: string
    selected?: boolean
    onClick?: () => void
    onClear?: () => void
    previewScore?: number | null
}

function RoleCell({ part, role, index, value, selected, onClick, onClear, previewScore }: RoleCellProps) {
    const dropId = encodeDropId({ part, role, index })
    const assignedId = encodeAssignedId({ part, role, index }, value)

    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: dropId })
    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        transform,
        isDragging,
    } = useDraggable({
        id: assignedId,
        disabled: value === BLANK_ROLE_VALUE || value === '',
    })

    const isEmpty = value === '' || value === BLANK_ROLE_VALUE
    const displayValue = isEmpty ? '' : stripCohort(value)

    const style: CSSProperties = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 100 : undefined,
    }

    // 점수에 따른 색상 결정
    const getScoreColor = (score: number) => {
        if (score >= 120) return 'text-[var(--color-success)]'
        if (score >= 80) return 'text-[var(--color-accent)]'
        if (score >= 0) return 'text-[var(--color-warning)]'
        return 'text-[var(--color-danger)]'
    }

    return (
        <div
            ref={setDropRef}
            className={clsx(
                'relative w-full h-[36px] transition-colors duration-200',
                'rounded-[var(--radius-sm)]',
                isOver && 'bg-blue-500/10 ring-1 ring-blue-500/50'
            )}
        >
            <div
                ref={setDragRef}
                className={clsx(
                    'group relative w-full h-full flex items-center justify-center',
                    'text-base font-medium transition-all duration-150',
                    'border border-transparent rounded-[var(--radius-sm)]',
                    'cursor-default',

                    // State Styles
                    isEmpty ? (
                        'text-[var(--color-label-tertiary)] hover:bg-[var(--color-surface-elevated)]'
                    ) : selected ? (
                        'bg-[var(--color-accent)] text-white shadow-sm shadow-blue-500/20 z-10'
                    ) : [
                        // Assigned State (Using array to avoid comma operator issue)
                        'bg-[var(--color-surface)] text-[var(--color-label-primary)]',
                        'border border-[var(--color-border-subtle)]',
                        'hover:border-[var(--color-border-default)] hover:shadow-sm cursor-grab active:cursor-grabbing'
                    ]
                )}
                style={style}
                onClick={onClick}
                {...attributes}
                {...listeners}
            >
                {/* 빈 슬롯: 점수 미리보기 표시 */}
                {isEmpty && previewScore !== null && previewScore !== undefined ? (
                    <span className={clsx(
                        'text-xs font-bold',
                        getScoreColor(previewScore)
                    )}>
                        +{previewScore}
                    </span>
                ) : (
                    <span className="truncate px-2">{displayValue || '—'}</span>
                )}

                {!isEmpty && onClear && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            onClear()
                        }}
                        className={clsx(
                            'absolute -top-1 -right-1 w-4 h-4 rounded-full',
                            'flex items-center justify-center',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'border border-[var(--color-border-subtle)] shadow-sm',
                            selected
                                ? 'bg-white text-[var(--color-danger)]'
                                : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] hover:text-[var(--color-danger)]'
                        )}
                        tabIndex={-1}
                    >
                        <Icon name="close" size={10} />
                    </button>
                )}
            </div>
        </div>
    )
}

type Props = {
    selectedMember?: string | null
    onSlotClick?: (part: PartKey, role: RoleKey, index?: 0 | 1) => void
    onClearSlot?: (part: PartKey, role: RoleKey, index?: 0 | 1) => void
    previewScores?: Map<SlotKey, number> | null
}

export default function AssignmentTable({ selectedMember, onSlotClick, onClearSlot, previewScores }: Props) {
    const draft = useAppStore((s) => s.currentDraft)

    const getValue = (part: PartKey, role: RoleKey, index?: 0 | 1): string => {
        const p = draft[part]
        if (role === '사이드') {
            return p['사이드'][index ?? 0] || ''
        }
        return (p[role] as string) || ''
    }

    const getSlotKey = (part: PartKey, role: RoleKey, index?: 0 | 1): SlotKey => {
        if (index !== undefined) return `${part}-${role}-${index}`
        return `${part}-${role}`
    }

    const gridCols = 'grid-cols-[48px_1fr_1fr_1fr_2fr_1fr]'

    return (
        <div className="w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            {/* Header */}
            <div className={clsx('grid gap-px bg-[var(--color-border-subtle)] border-b border-[var(--color-border-subtle)]', gridCols)}>
                <div className="bg-[var(--color-surface-elevated)]" />
                {RoleKeys.map((role) => (
                    <div key={role} className="bg-[var(--color-surface-elevated)] py-2 flex items-center justify-center gap-1.5">
                        <span className={clsx('text-sm font-semibold', ROLE_COLORS[role])}>
                            {role}
                        </span>
                        <span className="text-xs text-[var(--color-label-tertiary)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded-full border border-[var(--color-border-subtle)]">
                            {ROLE_COUNTS[role]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Rows */}
            <div className={clsx('grid gap-px bg-[var(--color-border-subtle)]', gridCols)}>
                {(['part1', 'part2'] as PartKey[]).map((part) => (
                    <div key={part} className="contents">
                        {/* Row Header */}
                        <div className={clsx(
                            'bg-[var(--color-surface-elevated)] flex items-center justify-center',
                            'text-sm font-bold text-[var(--color-label-secondary)]'
                        )}>
                            {part === 'part1' ? '1부' : '2부'}
                        </div>

                        {/* Cells */}
                        {RoleKeys.map((role) => {
                            const CellWrapper = ({ children }: { children: React.ReactNode }) => (
                                <div className="bg-[var(--color-canvas)] p-1 flex items-center justify-center">
                                    {children}
                                </div>
                            )

                            if (role === '사이드') {
                                return (
                                    <CellWrapper key={`${part}-${role}`}>
                                        <div className="flex w-full gap-1">
                                            {[0, 1].map((idx) => {
                                                const slotKey = getSlotKey(part, role, idx as 0 | 1)
                                                const value = getValue(part, role, idx as 0 | 1)
                                                const isEmpty = value === '' || value === BLANK_ROLE_VALUE
                                                return (
                                                    <RoleCell
                                                        key={idx}
                                                        part={part}
                                                        role={role}
                                                        index={idx as 0 | 1}
                                                        value={value}
                                                        selected={selectedMember === value && value !== ''}
                                                        onClick={() => onSlotClick?.(part, role, idx as 0 | 1)}
                                                        onClear={() => onClearSlot?.(part, role, idx as 0 | 1)}
                                                        previewScore={isEmpty && previewScores ? previewScores.get(slotKey) ?? null : null}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </CellWrapper>
                                )
                            }

                            const slotKey = getSlotKey(part, role)
                            const value = getValue(part, role)
                            const isEmpty = value === '' || value === BLANK_ROLE_VALUE

                            return (
                                <CellWrapper key={`${part}-${role}`}>
                                    <RoleCell
                                        part={part}
                                        role={role}
                                        value={value}
                                        selected={selectedMember === value && value !== ''}
                                        onClick={() => onSlotClick?.(part, role)}
                                        onClear={() => onClearSlot?.(part, role)}
                                        previewScore={isEmpty && previewScores ? previewScores.get(slotKey) ?? null : null}
                                    />
                                </CellWrapper>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}

export type { SlotKey }
