'use client'

import React, { useMemo, useState } from 'react'
import { useAppStore } from '@/shared/state/store'
import { calculateFairnessScore } from '../utils/statsCalculations'
import Icon from '@/shared/components/ui/Icon'

/**
 * FairnessIndicators - 공정성 지표 (Quick Fix & Inline Chips)
 * 
 * 주요 변경사항:
 * 1. 컬러 시맨틱 개선: 우선 배치(Green/Success), 배정 제외(Slate/Gray)
 * 2. 인라인 칩: 문장 내 멤버 이름을 칩으로 시각화하여 가독성 개선
 * 3. 정보 밀도 최적화: 구분선 및 여백 조정으로 시각적 피로도 감소
 * 4. Quick Fix: 명확한 액션 버튼 스타일 및 정보 계층화
 */

type Level = 'excellent' | 'good' | 'fair' | 'poor'

const LEVEL_CONFIG: Record<Level, { label: string; color: string }> = {
    excellent: { label: '우수', color: 'var(--color-success)' },
    good: { label: '양호', color: 'var(--color-accent)' },
    fair: { label: '보통', color: 'var(--color-warning)' },
    poor: { label: '개선필요', color: 'var(--color-danger)' }
}

function getScoreColor(score: number): string {
    if (score >= 70) return 'var(--color-success)'
    if (score >= 30) return 'var(--color-warning)'
    return 'var(--color-danger)'
}

// 텍스트 내 멤버 이름을 칩으로 변환하는 컴포넌트
function TextWithChips({ text, members }: { text: string; members?: string[] }) {
    if (!members || members.length === 0) return <>{text}</>

    // 멤버 이름이 포함된 정규식 (이름 앞뒤 공백 등을 고려하지 않고 단순 매칭)
    const pattern = new RegExp(`(${members.join('|')})`, 'g')
    const parts = text.split(pattern)

    return (
        <span className="leading-relaxed">
            {parts.map((part, i) => {
                if (members.includes(part)) {
                    return (
                        <span
                            key={i}
                            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)] align-baseline translate-y-[-1px]"
                        >
                            {part}
                        </span>
                    )
                }
                return part
            })}
        </span>
    )
}

// 원형 게이지 컴포넌트
function CircleGauge({ score, size = 120, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const progress = Math.min(Math.max(score, 0), 100) / 100
    const offset = circumference * (1 - progress)
    const color = getScoreColor(score)

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-border-subtle)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="text-3xl font-bold tabular-nums"
                    style={{ color, fontFamily: 'var(--font-mono)' }}
                >
                    {Math.round(score)}
                </span>
                <span className="text-xs text-[var(--color-label-tertiary)]">/ 100</span>
            </div>
        </div>
    )
}

// 프로그레스 바 컴포넌트
function ProgressBar({ score, className = '' }: { score: number; className?: string }) {
    const color = getScoreColor(score)
    const width = Math.min(Math.max(score, 0), 100)

    return (
        <div className={`h-1.5 bg-[var(--color-border-subtle)] rounded-full overflow-hidden ${className}`}>
            <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                    width: `${width}%`,
                    backgroundColor: color
                }}
            />
        </div>
    )
}

// 툴팁 컴포넌트
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
    const [show, setShow] = useState(false)

    return (
        <div className="relative inline-flex">
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                className="cursor-help"
            >
                {children}
            </div>
            {show && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-[var(--color-label-primary)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-lg shadow-lg w-56 text-center">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--color-surface-elevated)] border-r border-b border-[var(--color-border-default)] transform rotate-45 -mt-1" />
                </div>
            )}
        </div>
    )
}

// 지표 카드 컴포넌트
function MetricCard({
    label,
    score,
    description,
    tooltip,
    relatedInsight
}: {
    label: string
    score: number
    description: string
    tooltip?: string
    relatedInsight?: {
        title: string
        members?: string[]
    }
}) {
    const color = getScoreColor(score)
    const [expanded, setExpanded] = useState(false)

    return (
        <div
            className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)]/50 rounded-lg p-5 cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors group"
            onClick={() => relatedInsight && setExpanded(!expanded)}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[var(--color-label-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                        {label}
                    </span>
                    {tooltip && (
                        <Tooltip content={tooltip}>
                            <Icon name="info" size={16} className="text-[var(--color-label-tertiary)] opacity-60 hover:opacity-100 transition-opacity" />
                        </Tooltip>
                    )}
                </div>
                <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color, fontFamily: 'var(--font-mono)' }}
                >
                    {Math.round(score)}
                </span>
            </div>
            <ProgressBar score={score} className="mb-4" />

            <div className="pt-3 border-t border-dashed border-[var(--color-border-subtle)]">
                <p className="text-xs text-[var(--color-label-secondary)] font-medium line-clamp-2">
                    {description}
                </p>
            </div>

            {/* 인라인 상세 분석 (확장 시) */}
            {expanded && relatedInsight && (
                <div className="mt-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="text-xs text-[var(--color-label-tertiary)] mb-1 leading-relaxed bg-[var(--color-surface-elevated)] p-3 rounded border border-[var(--color-border-subtle)]">
                        <TextWithChips text={relatedInsight.title} members={relatedInsight.members} />
                    </div>
                </div>
            )}
        </div>
    )
}

// Quick Fix 태스크 아이템 (버튼 스타일 강화)
function QuickFixItem({
    action,
    target,
    impact,
    members
}: {
    action: string
    target: string
    impact: number
    members?: string[]
}) {
    return (
        <div className="group flex items-center justify-between py-3 hover:bg-[var(--color-surface)]/50 rounded px-3 -mx-3 transition-colors cursor-pointer">
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${action === '우선 조치'
                            ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20'
                            : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20'
                            }`}>
                            {action}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-label-primary)]">
                            {target}
                        </span>
                    </div>
                </div>
                {members && members.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {members.slice(0, 5).map((member) => (
                            <span
                                key={member}
                                className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)]"
                            >
                                {member}
                            </span>
                        ))}
                        {members.length > 5 && (
                            <span className="text-xs text-[var(--color-label-tertiary)] self-center ml-1">
                                +{members.length - 5}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs font-mono font-semibold text-[var(--color-success)]">
                    +{impact}pt
                </span>
                <button className="text-xs font-semibold text-white bg-[var(--color-accent)] px-2 py-0.5 rounded hover:bg-[var(--color-accent)]/90 transition-opacity opacity-0 group-hover:opacity-100 shadow-sm">
                    적용
                </button>
            </div>
        </div>
    )
}

// 조정 필요 멤버 섹션 (컬러 시맨틱 개선: Green/Slate)
function MemberAdjustmentSection({
    overAssigned,
    underAssigned
}: {
    overAssigned: string[]
    underAssigned: string[]
}) {
    if (overAssigned.length === 0 && underAssigned.length === 0) return null

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {underAssigned.length > 0 && (
                <div className="space-y-3">
                    <span className="text-xs font-semibold text-[var(--color-success)] uppercase tracking-wide flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                        우선 배치 (Chance+)
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {underAssigned.map((name) => (
                            <span
                                key={name}
                                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 font-medium hover:bg-[var(--color-success)]/20 transition-colors cursor-default"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {overAssigned.length > 0 && (
                <div className="space-y-3">
                    <span className="text-xs font-semibold text-[var(--color-label-tertiary)] uppercase tracking-wide flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-label-tertiary)]" />
                        배정 제외 (Rest)
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {overAssigned.map((name) => (
                            <span
                                key={name}
                                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)] border border-[var(--color-border-subtle)] font-medium hover:bg-[var(--color-surface)] transition-colors cursor-default"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function FairnessIndicators() {
    const app = useAppStore((s) => s.app)
    const data = useMemo(() => calculateFairnessScore(app), [app])

    const levelConfig = LEVEL_CONFIG[data.level as Level] || LEVEL_CONFIG.poor

    // 지표별 관련 인사이트 매핑
    const insightsByCategory = useMemo(() => {
        const map: Record<string, typeof data.insights[0]> = {}
        data.insights.forEach((insight) => {
            if (!map[insight.category]) {
                map[insight.category] = insight
            }
        })
        return map
    }, [data.insights])

    // 지표 정의
    const factors = [
        {
            key: 'opportunity',
            label: '기회 균등',
            score: data.breakdown.opportunityEquality.score,
            desc: data.breakdown.opportunityEquality.description,
            tooltip: '출석한 주 대비 배정받은 비율의 균등성을 측정합니다.',
            insight: insightsByCategory['opportunity']
        },
        {
            key: 'diversity',
            label: '역할 다양성',
            score: data.breakdown.roleDiversity.score,
            desc: data.breakdown.roleDiversity.description,
            tooltip: '멤버들이 얼마나 다양한 역할을 경험하는지 측정합니다.',
            insight: insightsByCategory['diversity']
        },
        {
            key: 'workload',
            label: '부담도 균형',
            score: data.breakdown.workloadBalance.score,
            desc: data.breakdown.workloadBalance.description,
            tooltip: '역할별 난이도를 고려한 총 부담의 균등성입니다.',
            insight: insightsByCategory['workload']
        },
        {
            key: 'consecutive',
            label: '연속 회피',
            score: data.breakdown.consecutiveAvoidance.score,
            desc: data.breakdown.consecutiveAvoidance.description,
            tooltip: '같은 역할을 연속으로 배정받는 것을 피하는지 측정합니다.',
            insight: insightsByCategory['consecutive']
        },
    ]

    // 최우선 조치 사항
    const priorityActions = useMemo(() => {
        const issues = data.insights.filter(i => i.type === 'issue')
        return issues.slice(0, 2).map((issue, idx) => ({
            action: idx === 0 ? '우선 조치' : '추가 조치',
            target: issue.title,
            impact: Math.round((100 - data.score) / (issues.length || 1) * 0.7),
            members: issue.affectedMembers
        }))
    }, [data.insights, data.score])

    // 과다/과소 배정 멤버 추출
    const { overAssigned, underAssigned } = useMemo(() => {
        const over: string[] = []
        const under: string[] = []

        data.insights.forEach((insight) => {
            if (insight.category === 'opportunity' && insight.affectedMembers) {
                if (insight.title.includes('집중') || insight.title.includes('과다')) {
                    over.push(...insight.affectedMembers.slice(0, 10)) // 더 많은 멤버 표시
                } else if (insight.title.includes('소외') || insight.title.includes('기회 부족') || insight.title.includes('미배정')) {
                    under.push(...insight.affectedMembers.slice(0, 10))
                }
            }
        })

        return { overAssigned: [...new Set(over)], underAssigned: [...new Set(under)] }
    }, [data.insights])

    // TODO: 배정 최적화 기능 연결 (보류)
    // const handleOptimize = () => {
    //     console.log('Optimize assignment triggered')
    // }

    return (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-[var(--color-label-primary)]">
                            공정성 지표
                        </h2>
                        <p className="text-xs text-[var(--color-label-tertiary)] mt-0.5">
                            배정 데이터 기반 분석
                        </p>
                    </div>
                    <div
                        className="text-xs font-medium px-2.5 py-1 rounded-md"
                        style={{
                            color: levelConfig.color,
                            backgroundColor: `color-mix(in srgb, ${levelConfig.color} 12%, transparent)`
                        }}
                    >
                        {levelConfig.label}
                    </div>
                </div>
            </div>

            {/* Score Overview */}
            <div className="px-6 py-6 border-b border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center gap-6">
                <CircleGauge score={data.score} size={110} strokeWidth={8} />
                <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm text-[var(--color-label-secondary)] leading-relaxed">
                        <TextWithChips text={data.description} members={underAssigned.concat(overAssigned)} />
                    </p>
                </div>
            </div>

            {/* 지표 그리드 (2x2) */}
            <div className="px-5 py-6 border-b border-[var(--color-border-subtle)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {factors.map((factor) => (
                        <MetricCard
                            key={factor.key}
                            label={factor.label}
                            score={factor.score}
                            description={factor.desc}
                            tooltip={factor.tooltip}
                            relatedInsight={factor.insight ? {
                                title: factor.insight.description,
                                members: factor.insight.affectedMembers
                            } : undefined}
                        />
                    ))}
                </div>
            </div>

            {/* 최우선 조치 사항 (Quick Fix 스타일) */}
            {priorityActions.length > 0 && (
                <div className="px-5 py-5 border-b border-[var(--color-border-subtle)]">
                    <p className="text-xs font-medium text-[var(--color-label-tertiary)] uppercase tracking-wide mb-2">
                        최우선 조치 사항
                    </p>
                    <div className="divide-y divide-[var(--color-border-subtle)]">
                        {priorityActions.map((action, idx) => (
                            <QuickFixItem
                                key={idx}
                                action={action.action}
                                target={action.target}
                                impact={action.impact}
                                members={action.members}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 조정이 필요한 멤버 */}
            {(overAssigned.length > 0 || underAssigned.length > 0) && (
                <div className="px-5 py-6 border-b border-[var(--color-border-subtle)]">
                    <div className="mb-4">
                        <p className="text-xs font-medium text-[var(--color-label-tertiary)] uppercase tracking-wide">
                            조정이 필요한 멤버
                        </p>
                    </div>
                    <MemberAdjustmentSection
                        overAssigned={overAssigned}
                        underAssigned={underAssigned}
                    />
                </div>
            )}

            {/* TODO: 하단 배정 최적화 버튼 (보류) */}
            {/* <div className="px-5 py-5 bg-[var(--color-surface)]/30">
                <button
                    // onClick={handleOptimize}
                    className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white text-sm font-semibold hover:bg-[var(--color-accent)]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <Icon name="auto_fix" size={18} />
                    배정 최적화 실행
                </button>
                <p className="text-xs text-[var(--color-label-tertiary)] text-center mt-3">
                    AI가 공정성을 높이는 최적의 배정안을 제안합니다
                </p>
            </div> */}
        </div>
    )
}
