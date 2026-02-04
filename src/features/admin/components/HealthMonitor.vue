<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Icon from '@/components/ui/Icon.vue'
import { toast } from 'vue-sonner'
import * as HealthService from '../services/healthService'

const store = useAssignmentStore()
const report = ref<HealthService.HealthReport | null>(null)
const isScanning = ref(false)

const healthColor = computed(() => {
    if (!report.value) return 'bg-gray-200'
    if (report.value.score >= 90) return 'bg-green-500'
    if (report.value.score >= 70) return 'bg-yellow-500'
    return 'bg-destructive'
})

const healthText = computed(() => {
    if (!report.value) return 'Unknown'
    if (report.value.score >= 90) return 'Healthy'
    if (report.value.score >= 70) return 'Warning'
    return 'Critical'
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

function fixIssues() {
    if (!confirm('문제가 발견된 항목들을 자동으로 수정(삭제)하시겠습니까?')) return
    
    const fixedData = HealthService.fixOrphans(store.app)
    store.importData(fixedData)
    store.syncToDb()
    
    toast.success('수정 완료', { description: '발견된 고아 데이터가 정리되었습니다.' })
    runScan() // Re-scan
}

function handleResetDummy() {
    if (!confirm('개발용 더미 데이터로 초기화하시겠습니까? 기존 데이터는 모두 삭제됩니다.')) return
    
    store.loadDummyData()
    toast.success('초기화 완료', { description: '더미 데이터가 로드되었습니다.' })
    runScan()
}

</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Status Card -->
        <Card class="md:col-span-1">
            <CardHeader>
                <CardTitle>Health Score</CardTitle>
                <CardDescription>전반적인 데이터 무결성 점수</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col items-center justify-center py-6">
                <div class="relative flex items-center justify-center mb-4">
                     <!-- Circular progress or simple badge -->
                     <div :class="`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold bg-muted ${report && report.score < 90 ? 'text-destructive' : 'text-foreground'}`">
                        {{ report ? report.score : '-' }}
                     </div>
                </div>
                <div :class="`text-sm font-medium px-3 py-1 rounded-full text-white ${healthColor}`">
                    {{ healthText }}
                </div>
            </CardContent>
            <CardFooter>
                <Button @click="runScan" class="w-full" :disabled="isScanning">
                    <Icon name="ArrowPathIcon" :class="`mr-2 ${isScanning ? 'animate-spin' : ''}`" :size="16" />
                    {{ isScanning ? '검사 중...' : '지금 검사하기' }}
                </Button>
            </CardFooter>
        </Card>

        <!-- Issues List -->
        <Card class="md:col-span-2">
            <CardHeader>
                <CardTitle>발견된 문제</CardTitle>
                <CardDescription>시스템이 감지한 데이터 불일치 항목입니다.</CardDescription>
            </CardHeader>
            <CardContent class="h-[300px] overflow-y-auto">
                <div v-if="!report" class="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Icon name="MagnifyingGlassIcon" :size="48" class="mb-4 opacity-50" />
                    <p>검사를 실행하여 데이터 상태를 확인하세요.</p>
                </div>
                <div v-else-if="report.issues.length === 0" class="flex flex-col items-center justify-center h-full text-green-600">
                    <Icon name="CheckCircleIcon" :size="48" class="mb-4" />
                    <p class="font-medium">All systems operational.</p>
                    <p class="text-sm text-muted-foreground">발견된 문제가 없습니다.</p>
                </div>
                <div v-else class="space-y-3">
                    <Alert v-for="issue in report.issues" :key="issue.id" variant="destructive">
                        <Icon name="ExclamationTriangleIcon" class="h-4 w-4" />
                        <AlertTitle class="ml-2">{{ issue.message }}</AlertTitle>
                        <AlertDescription class="ml-2 text-xs opacity-90">
                            {{ issue.details }}
                        </AlertDescription>
                    </Alert>
                </div>
            </CardContent>
            <CardFooter class="justify-between">
                <p class="text-xs text-muted-foreground">마지막 검사: {{ report ? new Date(report.timestamp).toLocaleTimeString() : '-' }}</p>
                <Button 
                    variant="outline" 
                    size="sm" 
                    v-if="report && report.issues.some(i => i.fixable)"
                    @click="fixIssues"
                >
                    <Icon name="WrenchScrewdriverIcon" class="mr-2" :size="14" />
                    가능한 문제 자동 해결
                </Button>
            </CardFooter>
        </Card>
    </div>

    <!-- Factory Reset Zone -->
    <Card class="border-destructive/30 bg-destructive/5 mt-8">
        <CardHeader>
            <CardTitle class="text-destructive">공장 초기화 및 디버그</CardTitle>
            <CardDescription>개발 및 테스트 목적의 기능입니다.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="destructive" @click="handleResetDummy">
                <Icon name="BeakerIcon" class="mr-2" :size="16" />
                더미 데이터로 덮어쓰기 (Dev Only)
            </Button>
        </CardContent>
    </Card>
  </div>
</template>
