<script setup lang="ts">
/**
 * TransferManager.vue
 * Modern Data IO Dashboard - 백업 및 복원
 */
import { ref, computed, toRaw } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label' 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Icon from '@/components/ui/Icon.vue'
import * as DataService from '../services/dataService'
import * as api from '@/api/db'
import type { AppData } from '@/shared/types'
import { toast } from 'vue-sonner'
import clsx from 'clsx'

const store = useAssignmentStore()

// -- Export State --
const exportMembers = ref(true)
const exportWeeks = ref(true)
const exportRangeType = ref<'all' | 'custom'>('all')
const exportStartDate = ref('')
const exportEndDate = ref('')

// -- Import State --
const importFile = ref<File | null>(null)
const importPreview = ref<Partial<AppData> | null>(null)
const mergeStrategy = ref<'overwrite' | 'merge_incoming' | 'merge_existing'>('merge_incoming')
const isImporting = ref(false)
const importStep = ref<'select' | 'preview' | 'confirm'>('select')

// -- Computed Preview Stats --
const previewStats = computed(() => {
    if (!importPreview.value) return null
    
    const incoming = importPreview.value
    const current = store.app
    
    // Members diff
    const incomingMemberNames = new Set((incoming.members ?? []).map(m => m.name))
    const currentMemberNames = new Set(current.members.map(m => m.name))
    const newMembers = [...incomingMemberNames].filter(n => !currentMemberNames.has(n))
    const conflictMembers = [...incomingMemberNames].filter(n => currentMemberNames.has(n))
    
    // Weeks diff  
    const incomingWeekDates = Object.keys(incoming.weeks ?? {})
    const currentWeekDates = new Set(Object.keys(current.weeks))
    const newWeeks = incomingWeekDates.filter(d => !currentWeekDates.has(d))
    const conflictWeeks = incomingWeekDates.filter(d => currentWeekDates.has(d))
    
    return {
        members: {
            total: incoming.members?.length ?? 0,
            new: newMembers.length,
            conflict: conflictMembers.length
        },
        weeks: {
            total: incomingWeekDates.length,
            new: newWeeks.length,
            conflict: conflictWeeks.length
        }
    }
})

function handleExport() {
    const options: DataService.ExportOptions = {
        includeMembers: exportMembers.value,
        includeWeeks: exportWeeks.value,
        weekRange: exportRangeType.value === 'custom' && exportStartDate.value && exportEndDate.value
            ? { start: exportStartDate.value, end: exportEndDate.value }
            : undefined
    }

    const data = DataService.filterDataForExport(toRaw(store.app), options)
    const filename = `backup-${new Date().toISOString().slice(0, 10)}.json`
    DataService.downloadJson(data, filename)
    toast.success('내보내기 완료', { description: `${filename} 파일이 다운로드되었습니다.` })
}

function onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        processFile(target.files[0])
    }
}

function onDrop(event: DragEvent) {
    if (event.dataTransfer?.files.length) {
        processFile(event.dataTransfer.files[0])
    }
}

async function processFile(file: File) {
    importFile.value = file
    try {
        const text = await file.text()
        const json = JSON.parse(text)
        
        // Basic validation
        if (!json.members && !json.weeks) {
            throw new Error('members 또는 weeks 필드가 필요합니다.')
        }
        
        importPreview.value = json
        importStep.value = 'preview'
    } catch (e: any) {
        toast.error('파일 읽기 실패', { description: e.message || '유효한 JSON 파일이 아닙니다.' })
        resetImport()
    }
}

function resetImport() {
    importFile.value = null
    importPreview.value = null
    importStep.value = 'select'
}

function proceedToConfirm() {
    importStep.value = 'confirm'
}

async function handleImport() {
    if (!importPreview.value) return
    isImporting.value = true
    try {
        const backupFilename = `auto-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
        DataService.downloadJson(toRaw(store.app), backupFilename)
        toast.info('자동 백업 완료', { description: `${backupFilename} 다운로드됨.` })
        
        const merged = DataService.mergeAppData(toRaw(store.app), importPreview.value!, mergeStrategy.value)
        const imported = await api.batchImport(merged)
        store.importData(merged)
        
        toast.success('가져오기 완료', { 
            description: `Members ${imported.members}명, Weeks ${imported.weeks}개가 DB에 저장되었습니다.` 
        })
        resetImport()
    } catch (e: any) {
        console.error('Import failed:', e)
        toast.error('가져오기 실패', { description: e.message || 'DB 저장 중 오류가 발생했습니다.' })
    } finally {
        isImporting.value = false
    }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
    <!-- Export Section -->
    <div class="space-y-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Icon name="ArrowDownTrayIcon" :size="20" class="text-blue-500" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-foreground">내보내기</h2>
          <p class="text-sm text-muted-foreground">데이터 백업 (JSON)</p>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Option Cards -->
        <div class="grid grid-cols-2 gap-3">
          <div 
            @click="exportMembers = !exportMembers"
            :class="clsx(
              'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center h-28',
              exportMembers ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-border-hover bg-background'
            )"
          >
            <Icon name="UserGroupIcon" :size="24" :class="exportMembers ? 'text-blue-500' : 'text-muted-foreground'" />
            <span :class="clsx('text-sm font-medium', exportMembers ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground')">팀원 데이터</span>
          </div>
          
          <div 
            @click="exportWeeks = !exportWeeks"
            :class="clsx(
              'p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center h-28',
              exportWeeks ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-border-hover bg-background'
            )"
          >
            <Icon name="CalendarDaysIcon" :size="24" :class="exportWeeks ? 'text-blue-500' : 'text-muted-foreground'" />
            <span :class="clsx('text-sm font-medium', exportWeeks ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground')">주차별 배정</span>
          </div>
        </div>

        <!-- Date Range (Conditional) -->
        <div v-if="exportWeeks" class="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 animate-in fade-in slide-in-from-top-2">
            <h4 class="text-xs font-bold uppercase text-muted-foreground tracking-wider">기간 설정</h4>
            <div class="flex flex-col gap-2">
                <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-background/80 cursor-pointer transition-colors">
                    <input type="radio" value="all" v-model="exportRangeType" class="w-4 h-4 text-blue-500 focus:ring-blue-500 border-gray-300" />
                    <span class="text-sm">전체 기간</span>
                </label>
                <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-background/80 transition-colors">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="radio" value="custom" v-model="exportRangeType" class="w-4 h-4 text-blue-500 focus:ring-blue-500 border-gray-300" />
                        <span class="text-sm">기간 지정</span>
                    </label>
                    <div v-if="exportRangeType === 'custom'" class="flex items-center gap-2 ml-auto animate-in fade-in zoom-in-95">
                        <Input type="date" v-model="exportStartDate" class="h-8 w-32 text-xs bg-background" />
                        <span class="text-muted-foreground text-xs">~</span>
                        <Input type="date" v-model="exportEndDate" class="h-8 w-32 text-xs bg-background" />
                    </div>
                </div>
            </div>
        </div>

        <Button @click="handleExport" class="w-full h-12 text-base font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow" size="lg">
            <Icon name="ArrowDownTrayIcon" class="mr-2" :size="18" />
            백업 파일 다운로드
        </Button>
      </div>
    </div>

    <!-- Import Section -->
    <div class="space-y-6 lg:border-l lg:border-border/50 lg:pl-12">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Icon name="ArrowUpTrayIcon" :size="20" class="text-orange-500" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-foreground">가져오기</h2>
          <p class="text-sm text-muted-foreground">데이터 복원 (JSON)</p>
        </div>
      </div>

      <!-- Step 1: Upload -->
      <div v-if="importStep === 'select'" class="space-y-6">
        <div 
            class="relative border-2 border-dashed border-border hover:border-orange-500/50 hover:bg-orange-500/5 rounded-2xl p-10 text-center transition-all cursor-pointer group"
            @dragover.prevent
            @drop.prevent="onDrop"
            @click="$refs.fileInput.click()"
        >
            <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileSelected" />
            <div class="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Icon name="DocumentTextIcon" :size="32" class="text-muted-foreground group-hover:text-orange-500 transition-colors" />
            </div>
            <h3 class="text-lg font-medium text-foreground mb-1">파일을 여기에 드래그하세요</h3>
            <p class="text-sm text-muted-foreground">또는 클릭하여 JSON 파일을 선택</p>
        </div>
        
        <Alert>
            <Icon name="ShieldCheckIcon" :size="16" class="text-emerald-500" />
            <AlertTitle class="font-medium ml-2 text-emerald-600 dark:text-emerald-400">안전한 복원</AlertTitle>
            <AlertDescription class="ml-2 mt-1 text-xs text-muted-foreground">
                가져오기 실행 전, 현재 데이터가 자동으로 백업되므로 안심하세요.
            </AlertDescription>
        </Alert>
      </div>

      <!-- Step 2: Preview & Config -->
      <div v-else-if="importStep === 'preview'" class="space-y-6 animate-in fade-in slide-in-from-right-4">
        <!-- Stats Card -->
        <div class="bg-muted/30 rounded-xl p-4 border border-border/50">
            <h4 class="text-sm font-medium mb-3 flex items-center gap-2">
                <Icon name="ChartBarIcon" :size="16" class="text-primary" /> 분석 결과
            </h4>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-background rounded-lg p-3 shadow-sm border border-border/50">
                    <span class="text-xs text-muted-foreground block mb-1">팀원</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-xl font-bold">{{ previewStats?.members.total }}</span>
                        <span class="text-xs text-emerald-500 font-medium" v-if="previewStats?.members.new">+{{ previewStats?.members.new }}</span>
                    </div>
                </div>
                <div class="bg-background rounded-lg p-3 shadow-sm border border-border/50">
                    <span class="text-xs text-muted-foreground block mb-1">주차 배정</span>
                    <div class="flex items-baseline gap-1">
                        <span class="text-xl font-bold">{{ previewStats?.weeks.total }}</span>
                        <span class="text-xs text-emerald-500 font-medium" v-if="previewStats?.weeks.new">+{{ previewStats?.weeks.new }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Strategy Select -->
        <div class="space-y-3">
            <h4 class="text-sm font-medium text-foreground">병합 방식 선택</h4>
            <div class="flex flex-col gap-2">
                <button 
                  v-for="st in [
                    { val: 'merge_incoming', label: '병합 (파일 우선)', desc: '기존 데이터 유지, 겹치면 파일 내용으로 덮어씀' },
                    { val: 'merge_existing', label: '병합 (기존 우선)', desc: '기존 데이터 유지, 겹치면 기존 내용 보존' },
                    { val: 'overwrite', label: '완전 덮어쓰기', desc: '⚠️ 기존 데이터를 모두 지우고 파일로 교체', danger: true }
                  ]" 
                  :key="st.val"
                  @click="mergeStrategy = st.val as any"
                  :class="clsx(
                    'text-left p-3 rounded-xl border-2 transition-all relative',
                    mergeStrategy === st.val 
                        ? (st.danger ? 'border-red-500 bg-red-500/5' : 'border-blue-500 bg-blue-500/5')
                        : 'border-border hover:border-border-hover bg-background'
                  )"
                >
                    <div class="font-medium text-sm flex items-center justify-between">
                        <span :class="st.danger && 'text-red-500'">{{ st.label }}</span>
                        <Icon v-if="mergeStrategy === st.val" name="CheckCircleIcon" :size="16" :class="st.danger ? 'text-red-500' : 'text-blue-500'" />
                    </div>
                    <div :class="clsx('text-xs mt-0.5', st.danger ? 'text-red-500/70' : 'text-muted-foreground')">{{ st.desc }}</div>
                </button>
            </div>
        </div>

        <div class="flex gap-3 pt-2">
            <Button variant="ghost" @click="resetImport" class="flex-1">취소</Button>
            <Button @click="proceedToConfirm" class="flex-1">다음 단계</Button>
        </div>
      </div>

      <!-- Step 3: Confirm -->
      <div v-else-if="importStep === 'confirm'" class="space-y-6 text-center animate-in fade-in zoom-in-95">
        <div class="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center text-red-500 animate-pulse">
            <Icon name="ExclamationTriangleIcon" :size="32" />
        </div>
        <div class="space-y-2">
            <h3 class="text-lg font-bold">정말 실행하시겠습니까?</h3>
            <p class="text-sm text-muted-foreground">
                이 작업은 되돌릴 수 없으며(자동 백업 제외),<br>
                데이터베이스에 즉시 반영됩니다.
            </p>
        </div>
        
        <div class="p-4 bg-muted/30 rounded-xl text-left space-y-2 border border-border/50 text-sm">
            <div class="flex justify-between">
                <span class="text-muted-foreground">병합 방식</span>
                <span class="font-medium">{{ mergeStrategy === 'overwrite' ? '완전 덮어쓰기' : '병합' }}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-muted-foreground">변경 대상</span>
                <span class="font-medium text-foreground">Members, Weeks</span>
            </div>
        </div>

        <div class="flex gap-3">
             <Button variant="outline" @click="importStep = 'preview'" :disabled="isImporting" class="flex-1">이전</Button>
             <Button 
                :variant="mergeStrategy === 'overwrite' ? 'destructive' : 'default'" 
                @click="handleImport" 
                :disabled="isImporting" 
                class="flex-1 shadow-lg shadow-primary/20"
            >
                {{ isImporting ? '처리 중...' : '확인 및 실행' }}
             </Button>
        </div>
      </div>
    </div>
  </div>
</template>
