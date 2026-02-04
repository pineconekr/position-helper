<script setup lang="ts">
import { ref, computed, toRaw } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label' 
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Icon from '@/components/ui/Icon.vue'
import * as DataService from '../services/dataService'
import * as api from '@/api/db'
import type { AppData } from '@/shared/types'
import { toast } from 'vue-sonner'

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

// -- Methods --

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
        importFile.value = target.files[0]
        parseFile(target.files[0])
    }
}

async function parseFile(file: File) {
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
        // Step 1: Auto-backup current data (safety net)
        const backupFilename = `auto-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
        DataService.downloadJson(toRaw(store.app), backupFilename)
        toast.info('자동 백업 완료', { description: `${backupFilename} 다운로드됨. 문제 시 이 파일로 복구하세요.` })
        
        // Step 2: Merge data locally
        const merged = DataService.mergeAppData(toRaw(store.app), importPreview.value!, mergeStrategy.value)
        
        // Step 3: Save ALL data to DB in one batch request (prevents rate limit)
        const imported = await api.batchImport(merged)
        
        // Step 4: Update local store
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
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Export Card -->
    <Card>
      <CardHeader>
        <CardTitle>내보내기 (Backup)</CardTitle>
        <CardDescription>현재 데이터를 JSON 파일로 다운로드합니다.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-3">
          <h4 class="text-sm font-medium">포함할 데이터</h4>
          <div class="flex flex-col gap-2">
            <div class="flex items-center space-x-2">
              <Checkbox id="exp-members" :checked="exportMembers" @update:checked="exportMembers = $event" />
              <label for="exp-members" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                팀원 (Members)
              </label>
            </div>
            <div class="flex items-center space-x-2">
              <Checkbox id="exp-weeks" :checked="exportWeeks" @update:checked="exportWeeks = $event" />
              <label for="exp-weeks" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                주차별 배정 (Weeks)
              </label>
            </div>
          </div>
        </div>

        <div class="space-y-3" v-if="exportWeeks">
          <h4 class="text-sm font-medium">기간 설정</h4>
          <RadioGroup v-model="exportRangeType" class="flex flex-col space-y-1">
            <div class="flex items-center space-x-2">
              <RadioGroupItem value="all" id="range-all" />
              <label for="range-all" class="text-sm">전체 기간</label>
            </div>
            <div class="flex items-center space-x-2">
               <RadioGroupItem value="custom" id="range-custom" />
               <label for="range-custom" class="text-sm">기간 직접 지정</label>
            </div>
          </RadioGroup>
          
          <div v-if="exportRangeType === 'custom'" class="flex items-center gap-2 mt-2 pl-6 animate-in slide-in-from-top-2">
            <Input type="date" v-model="exportStartDate" class="w-36 text-xs" />
            <span class="text-muted-foreground">~</span>
            <Input type="date" v-model="exportEndDate" class="w-36 text-xs" />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button @click="handleExport" class="w-full">
          <Icon name="ArrowDownTrayIcon" class="mr-2" :size="16" />
          JSON 파일 다운로드
        </Button>
      </CardFooter>
    </Card>

    <!-- Import Card -->
    <Card>
      <CardHeader>
        <CardTitle>가져오기 (Restore)</CardTitle>
        <CardDescription>JSON 백업 파일을 불러와서 적용합니다.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        
        <!-- Step 1: File Select -->
        <div v-if="importStep === 'select'" class="space-y-4">
            <div class="space-y-2">
                <Label>백업 파일 선택</Label>
                <Input type="file" accept=".json" @change="onFileSelected" />
            </div>
            <p class="text-xs text-muted-foreground">
                <Icon name="ShieldCheckIcon" :size="12" class="inline mr-1" />
                가져오기 전에 현재 데이터가 자동으로 백업됩니다.
            </p>
        </div>

        <!-- Step 2: Preview -->
        <div v-else-if="importStep === 'preview'" class="space-y-4 animate-in fade-in">
            <Alert>
                <Icon name="DocumentTextIcon" class="h-4 w-4" />
                <AlertTitle class="ml-2">파일 분석 완료</AlertTitle>
                <AlertDescription class="ml-2 mt-2 space-y-1">
                    <div v-if="previewStats?.members.total">
                        • 팀원: <strong>{{ previewStats.members.total }}명</strong>
                        <span class="text-green-600" v-if="previewStats.members.new">(새 {{ previewStats.members.new }}명)</span>
                        <span class="text-yellow-600" v-if="previewStats.members.conflict">(겹침 {{ previewStats.members.conflict }}명)</span>
                    </div>
                    <div v-if="previewStats?.weeks.total">
                        • 배정 데이터: <strong>{{ previewStats.weeks.total }}주차</strong>
                        <span class="text-green-600" v-if="previewStats.weeks.new">(새 {{ previewStats.weeks.new }}개)</span>
                        <span class="text-yellow-600" v-if="previewStats.weeks.conflict">(겹침 {{ previewStats.weeks.conflict }}개)</span>
                    </div>
                </AlertDescription>
            </Alert>

            <div class="space-y-3">
                <h4 class="text-sm font-medium">병합 방식</h4>
                <RadioGroup v-model="mergeStrategy" class="space-y-2">
                    <div class="flex items-start space-x-2">
                        <RadioGroupItem value="merge_incoming" id="strat-incoming" class="mt-1" />
                        <div class="grid gap-0.5">
                            <label for="strat-incoming" class="text-sm font-medium">병합 (파일 우선)</label>
                            <p class="text-xs text-muted-foreground">겹치는 내용은 파일 내용으로 덮어씀</p>
                        </div>
                    </div>
                    <div class="flex items-start space-x-2">
                        <RadioGroupItem value="merge_existing" id="strat-existing" class="mt-1" />
                        <div class="grid gap-0.5">
                            <label for="strat-existing" class="text-sm font-medium">병합 (기존 유지)</label>
                            <p class="text-xs text-muted-foreground">겹치는 내용은 기존 DB 유지</p>
                        </div>
                    </div>
                    <div class="flex items-start space-x-2">
                        <RadioGroupItem value="overwrite" id="strat-overwrite" class="mt-1 border-destructive" />
                        <div class="grid gap-0.5">
                            <label for="strat-overwrite" class="text-sm font-medium text-destructive">완전 덮어쓰기</label>
                            <p class="text-xs text-destructive/70">기존 데이터 삭제 후 파일로 교체</p>
                        </div>
                    </div>
                </RadioGroup>
            </div>

            <div class="flex gap-2 pt-2">
                <Button variant="outline" size="sm" @click="resetImport" class="flex-1">
                    취소
                </Button>
                <Button variant="default" size="sm" @click="proceedToConfirm" class="flex-1">
                    다음
                </Button>
            </div>
        </div>

        <!-- Step 3: Confirm -->
        <div v-else-if="importStep === 'confirm'" class="space-y-4 animate-in fade-in">
            <Alert variant="destructive">
                <Icon name="ExclamationTriangleIcon" class="h-4 w-4" />
                <AlertTitle class="ml-2">최종 확인</AlertTitle>
                <AlertDescription class="ml-2 mt-2">
                    <p class="mb-2">이 작업은 DB에 즉시 반영됩니다.</p>
                    <ul class="text-xs space-y-1 list-disc list-inside">
                        <li>현재 데이터가 자동으로 백업됩니다</li>
                        <li v-if="mergeStrategy === 'overwrite'"><strong>기존 데이터가 모두 삭제됩니다</strong></li>
                        <li v-else>기존 데이터와 병합됩니다</li>
                    </ul>
                </AlertDescription>
            </Alert>

            <div class="flex gap-2">
                <Button variant="outline" size="sm" @click="importStep = 'preview'" class="flex-1" :disabled="isImporting">
                    <Icon name="ArrowLeftIcon" :size="14" class="mr-1" /> 이전
                </Button>
                <Button 
                    :variant="mergeStrategy === 'overwrite' ? 'destructive' : 'default'" 
                    size="sm" 
                    @click="handleImport" 
                    class="flex-1"
                    :disabled="isImporting"
                >
                    <Icon name="ArrowUpTrayIcon" :size="14" class="mr-1" />
                    {{ isImporting ? '저장 중...' : 'DB에 적용' }}
                </Button>
            </div>
        </div>

      </CardContent>
    </Card>
  </div>
</template>
