<script setup lang="ts">
/**
 * HealthMonitor.vue
 * System Health Dashboard - 무결성 검사
 */
import { ref, computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Icon from '@/components/ui/Icon.vue'
import { toast } from 'vue-sonner'
import * as HealthService from '../services/healthService'
import clsx from 'clsx'
import { modal } from '@/shared/composables/useModal'

const store = useAssignmentStore()
const report = ref<HealthService.HealthReport | null>(null)
const isScanning = ref(false)

const scoreColor = computed(() => {
    if (!report.value) return 'text-muted-foreground'
    if (report.value.score >= 90) return 'text-emerald-500'
    if (report.value.score >= 70) return 'text-amber-500'
    return 'text-red-500'
})

const scoreLabel = computed(() => {
    if (!report.value) return '검사 대기'
    if (report.value.score >= 90) return '매우 안전'
    if (report.value.score >= 70) return '주의 필요'
    return '위험'
})

function runScan() {
    isScanning.value = true
    setTimeout(() => {
        report.value = HealthService.scanData(store.app)
        isScanning.value = false
        if (report.value.issues.length === 0) {
            toast.success('검사 완료', { description: '데이터에 문제가 발견되지 않았습니다.' })
        } else {
            toast.warning('검사 완료', { description: `${report.value.issues.length}개의 문제가 발견되었습니다.` })
        }
    }, 800)
}

async function fixIssues() {
    const confirmed = await modal.confirm({
        title: '자동 수정',
        message: '문제가 발견된 항목들을 자동으로 수정(삭제)하시겠습니까?',
        confirmText: '수정 실행',
        variant: 'destructive'
    })
    if (!confirmed) return
    
    const fixedData = HealthService.fixOrphans(store.app)
    store.importData(fixedData)
    store.syncToDb()
    
    toast.success('수정 완료', { description: '발견된 고아 데이터가 정리되었습니다.' })
    runScan() // Re-scan
}

async function handleResetDummy() {
    const confirmed = await modal.confirm({
        title: '데이터 초기화',
        message: '개발용 더미 데이터로 초기화하시겠습니까? 기존 데이터는 모두 삭제됩니다.',
        confirmText: '초기화',
        variant: 'destructive'
    })
    if (!confirmed) return
    
    store.loadDummyData()
    toast.success('초기화 완료', { description: '더미 데이터가 로드되었습니다.' })
    runScan()
}

// 점수에 따른 SVG Circle
const circleDasharray = computed(() => {
    const score = report.value?.score ?? 0
    // r=40, circumference = 251.2
    const circumference = 251.2
    return `${(score / 100) * circumference} ${circumference}`
})
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Main Dashboard Card -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Score Card -->
        <div class="md:col-span-1 bg-background rounded-2xl border border-border/50 p-6 flex flex-col items-center justify-between min-h-[280px] shadow-sm relative overflow-hidden">
            <!-- Background Decoration -->
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-20"></div>
            
            <div class="text-center mt-2">
                <h3 class="font-medium text-muted-foreground">데이터 건강 점수</h3>
            </div>

            <div class="relative w-32 h-32 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="8" fill="transparent" class="text-muted/30" />
                    <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke="currentColor" 
                        stroke-width="8" 
                        fill="transparent" 
                        :class="clsx('transition-all duration-1000 ease-out', scoreColor)"
                        stroke-linecap="round"
                        :stroke-dasharray="circleDasharray"
                        stroke-dashoffset="0"
                    />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span :class="clsx('text-3xl font-bold', scoreColor)">
                        {{ report ? report.score : '-' }}
                    </span>
                    <span v-if="report" class="text-xs font-medium text-muted-foreground mt-1">{{ scoreLabel }}</span>
                </div>
            </div>

            <Button @click="runScan" :disabled="isScanning" class="w-full mt-4" :variant="report ? 'outline' : 'default'">
                <Icon name="ArrowPathIcon" :class="clsx('mr-2', isScanning && 'animate-spin')" :size="16" />
                {{ isScanning ? '정밀 검사 중...' : (report ? '다시 검사하기' : '지금 검사 시작') }}
            </Button>
        </div>

        <!-- Issues Panel -->
        <div class="md:col-span-2 bg-background rounded-2xl border border-border/50 p-6 shadow-sm flex flex-col">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h3 class="font-bold text-lg">발견된 문제</h3>
                    <p class="text-sm text-muted-foreground">데이터 무결성 검사 리포트</p>
                </div>
                <div v-if="report" class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {{ new Date(report.timestamp).toLocaleTimeString() }} 기준
                </div>
            </div>

            <div class="flex-1 min-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                <!-- Empty States -->
                <div v-if="!report" class="h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-3 border-2 border-dashed border-muted rounded-xl bg-muted/20">
                    <Icon name="MagnifyingGlassIcon" :size="40" />
                    <p class="text-sm">왼쪽의 '검사 시작' 버튼을 눌러주세요.</p>
                </div>

                <div v-else-if="report.issues.length === 0" class="h-full flex flex-col items-center justify-center text-emerald-600 gap-3 border-emerald-500/20 bg-emerald-500/5 rounded-xl border">
                    <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Icon name="CheckCircleIcon" :size="24" />
                    </div>
                    <div>
                        <p class="font-bold">모든 데이터가 안전합니다</p>
                        <p class="text-xs text-emerald-600/70 text-center mt-1">발견된 오류 없음</p>
                    </div>
                </div>

                <!-- Issue List -->
                <div v-else class="space-y-3">
                    <div 
                        v-for="issue in report.issues" 
                        :key="issue.id" 
                        class="flex gap-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20 items-start"
                    >
                        <div class="mt-1 w-5 h-5 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center flex-shrink-0">
                            <Icon name="ExclamationTriangleIcon" :size="12" />
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-red-700 dark:text-red-400">{{ issue.message }}</h4>
                            <p class="text-xs text-muted-foreground mt-0.5">{{ issue.details }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fix Actions -->
            <div v-if="report && report.issues.some(i => i.fixable)" class="mt-4 pt-4 border-t border-border/50 flex justify-end">
                <Button variant="destructive" size="sm" @click="fixIssues" class="shadow-lg shadow-red-500/20">
                    <Icon name="WrenchScrewdriverIcon" class="mr-2" :size="14" />
                    {{ report.issues.filter(i => i.fixable).length }}개 문제 자동 해결
                </Button>
            </div>
        </div>
    </div>

    <!-- Advanced Zone -->
    <div class="pt-8 mt-8 border-t border-border/30">
        <div class="flex items-center gap-2 mb-4 opacity-70">
            <Icon name="BeakerIcon" :size="16" />
            <span class="text-xs font-bold uppercase tracking-wider">Developer Zone</span>
        </div>
        
        <div class="bg-muted/30 border border-border/50 rounded-xl p-4 flex items-center justify-between">
            <div>
                <h4 class="text-sm font-medium">테스트 데이터 로드</h4>
                <p class="text-xs text-muted-foreground mt-0.5">기존 데이터를 모두 삭제하고 더미 데이터를 생성합니다.</p>
            </div>
            <Button variant="outline" size="sm" @click="handleResetDummy" class="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors">
                <Icon name="ArrowPathIcon" class="mr-2" :size="14" />
                초기화 실행
            </Button>
        </div>
    </div>
  </div>
</template>
