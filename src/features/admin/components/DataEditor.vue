<script setup lang="ts">
/**
 * DataEditor.vue - 주차별 배정 데이터 JSON 편집기
 * 
 * Members 편집은 기존 팀원 탭에서 가능하므로, 여기서는 Weeks JSON만 편집합니다.
 */
import { ref, watch, computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import type { WeekData } from '@/shared/types'
import { toast } from 'vue-sonner'
import * as api from '@/api/db'

const store = useAssignmentStore()

// =====================
// WEEKS LOGIC
// =====================
const weekKeys = computed(() => Object.keys(store.app.weeks).sort().reverse())
const selectedWeekKey = ref<string | null>(null)
const weekJsonText = ref('')
const weeksDirty = ref(false)
const isSaving = ref(false)

watch(weekKeys, (keys) => {
    if (keys.length > 0 && !selectedWeekKey.value) {
        selectedWeekKey.value = keys[0]
    }
}, { immediate: true })

watch(selectedWeekKey, (key) => {
    if (key && store.app.weeks[key]) {
        weekJsonText.value = JSON.stringify(store.app.weeks[key], null, 2)
        weeksDirty.value = false
    }
}, { immediate: true })

function markWeeksDirty() {
    weeksDirty.value = true
}

async function saveWeek() {
    if (!selectedWeekKey.value) return
    
    let parsed: WeekData
    try {
        parsed = JSON.parse(weekJsonText.value) as WeekData
        // Basic validation
        if (!parsed.part1 || !parsed.part2) {
            throw new Error('part1, part2 필드가 필요합니다.')
        }
    } catch (e: any) {
        toast.error('JSON 파싱 오류', { description: e.message || '유효한 JSON이 아닙니다.' })
        return
    }

    isSaving.value = true
    try {
        // 1. Update local store
        store.app.weeks[selectedWeekKey.value] = parsed
        
        // 2. Save to DB directly
        await api.saveWeekAssignment(selectedWeekKey.value, parsed)
        
        weeksDirty.value = false
        toast.success('저장 완료', { description: `${selectedWeekKey.value} 주차 데이터가 DB에 저장되었습니다.` })
    } catch (e: any) {
        console.error('Failed to save week:', e)
        toast.error('저장 실패', { description: e.message || 'DB 저장 중 오류가 발생했습니다.' })
    } finally {
        isSaving.value = false
    }
}

function resetWeek() {
    if (selectedWeekKey.value && store.app.weeks[selectedWeekKey.value]) {
        weekJsonText.value = JSON.stringify(store.app.weeks[selectedWeekKey.value], null, 2)
        weeksDirty.value = false
        toast.info('되돌림', { description: '변경 사항이 취소되었습니다.' })
    }
}

async function deleteWeek() {
    if (!selectedWeekKey.value) return
    if (!confirm(`'${selectedWeekKey.value}' 주차 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
    
    isSaving.value = true
    try {
        // Delete from store
        delete store.app.weeks[selectedWeekKey.value]
        
        // Note: API for deleting week data would be needed here
        // For now, just update local state
        
        selectedWeekKey.value = weekKeys.value[0] || null
        toast.success('삭제 완료', { description: '주차 데이터가 삭제되었습니다.' })
    } finally {
        isSaving.value = false
    }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header Info -->
    <div class="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="InformationCircleIcon" :size="16" />
            <span>주차별 배정 데이터를 JSON 형식으로 직접 편집할 수 있습니다.</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
             <Badge v-if="weeksDirty" variant="outline" class="text-yellow-600 border-yellow-400">
                <Icon name="ExclamationCircleIcon" :size="12" class="mr-1" /> 변경사항 있음
             </Badge>
             <Button variant="outline" size="sm" @click="resetWeek" :disabled="!weeksDirty || isSaving">
                <Icon name="ArrowPathIcon" :size="14" class="mr-1" /> 되돌리기
             </Button>
             <Button variant="default" size="sm" @click="saveWeek" :disabled="!weeksDirty || isSaving">
                <Icon name="CheckIcon" :size="14" class="mr-1" /> 
                {{ isSaving ? '저장 중...' : 'DB에 저장' }}
             </Button>
        </div>
    </div>

    <!-- Weeks Editor -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Week Selector -->
        <Card class="md:col-span-1">
            <CardHeader class="py-3 px-4">
                <CardTitle class="text-sm">주차 선택</CardTitle>
                <CardDescription class="text-xs">{{ weekKeys.length }}개의 주차 데이터</CardDescription>
            </CardHeader>
            <CardContent class="p-0">
                <div class="max-h-[450px] overflow-y-auto">
                    <button
                        v-for="key in weekKeys"
                        :key="key"
                        @click="selectedWeekKey = key"
                        :class="[
                            'w-full px-4 py-2.5 text-left text-sm border-b transition-colors',
                            selectedWeekKey === key 
                                ? 'bg-primary text-primary-foreground font-medium' 
                                : 'hover:bg-muted/50'
                        ]"
                    >
                        <Icon name="CalendarDaysIcon" :size="14" class="inline mr-2 opacity-70" />
                        {{ key }}
                    </button>
                </div>
                <div v-if="weekKeys.length === 0" class="p-4 text-center text-muted-foreground text-sm">
                    저장된 주차 데이터가 없습니다.
                </div>
            </CardContent>
        </Card>

        <!-- JSON Editor -->
        <Card class="md:col-span-3">
            <CardHeader class="py-3 px-4 flex flex-row items-center justify-between">
                <div>
                    <CardTitle class="text-sm">
                        {{ selectedWeekKey ? `${selectedWeekKey} 배정 데이터` : '주차를 선택하세요' }}
                    </CardTitle>
                    <CardDescription class="text-xs" v-if="selectedWeekKey">
                        part1, part2 구조로 각 파트의 배정 정보를 포함합니다.
                    </CardDescription>
                </div>
                <Button 
                    v-if="selectedWeekKey"
                    variant="destructive" 
                    size="sm"
                    @click="deleteWeek"
                    :disabled="isSaving"
                >
                    <Icon name="TrashIcon" :size="14" class="mr-1" /> 삭제
                </Button>
            </CardHeader>
            <CardContent>
                <div v-if="selectedWeekKey">
                    <Textarea
                        v-model="weekJsonText"
                        class="font-mono text-xs h-[420px] resize-none"
                        placeholder="JSON 데이터..."
                        @input="markWeeksDirty"
                    />
                    <p class="text-xs text-muted-foreground mt-2">
                        <Icon name="ShieldCheckIcon" :size="12" class="inline mr-1" />
                        저장 전에 JSON 유효성을 검사합니다. 잘못된 형식이면 저장되지 않습니다.
                    </p>
                </div>
                <div v-else class="h-[420px] flex items-center justify-center text-muted-foreground">
                    <div class="text-center">
                        <Icon name="DocumentIcon" :size="48" class="mx-auto mb-4 opacity-30" />
                        <p>왼쪽에서 주차를 선택하세요</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  </div>
</template>
