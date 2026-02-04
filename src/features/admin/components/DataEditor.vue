<script setup lang="ts">
/**
 * DataEditor.vue - 주차별 배정 데이터 JSON 편집기 (IDE Style with CodeMirror)
 */
import { ref, watch, computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/ui/Icon.vue'
import type { WeekData } from '@/shared/types'
import { toast } from 'vue-sonner'
import * as api from '@/api/db'
import clsx from 'clsx'
import { modal } from '@/shared/composables/useModal'

// CodeMirror
import { Codemirror } from 'vue-codemirror'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const store = useAssignmentStore()

// =====================
// WEEKS LOGIC
// =====================
const weekKeys = computed(() => Object.keys(store.app.weeks).sort().reverse())
const selectedWeekKey = ref<string | null>(null)
const weekJsonText = ref('')
const weeksDirty = ref(false)
const isSaving = ref(false)
const searchTerm = ref('')

// CodeMirror Settings
const extensions = [json(), oneDark, EditorView.lineWrapping]

const filteredWeeks = computed(() => {
    if (!searchTerm.value) return weekKeys.value
    return weekKeys.value.filter(k => k.includes(searchTerm.value))
})

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

function handleChange(val: string) {
    weekJsonText.value = val
    weeksDirty.value = true
}

async function saveWeek() {
    if (!selectedWeekKey.value) return
    let parsed: WeekData
    try {
        parsed = JSON.parse(weekJsonText.value) as WeekData
        if (!parsed.part1 || !parsed.part2) throw new Error('part1, part2 필드가 필수입니다.')
    } catch (e: any) {
        toast.error('JSON 문법 오류', { description: '유효한 JSON 형식이 아닙니다. 괄호나 콤마를 확인하세요.' })
        return
    }

    isSaving.value = true
    try {
        // 1. Optimistic update (Local)
        store.app.weeks[selectedWeekKey.value] = parsed
        
        // 2. Save to DB
        await api.saveWeekAssignment(selectedWeekKey.value, parsed)
        
        // 3. Mark as clean
        weeksDirty.value = false
        
        // 4. Success Feedback
        toast.success('DB 저장 성공', { 
            description: `'${selectedWeekKey.value}' 데이터가 안전하게 업데이트되었습니다.`,
            duration: 3000
        })
    } catch (e: any) {
        console.error('Save failed:', e)
        toast.error('DB 저장 실패', { 
            description: e.message || '서버 통신 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.',
            duration: 5000 
        })
    } finally {
        isSaving.value = false
    }
}

function resetWeek() {
    if (selectedWeekKey.value && store.app.weeks[selectedWeekKey.value]) {
        weekJsonText.value = JSON.stringify(store.app.weeks[selectedWeekKey.value], null, 2)
        weeksDirty.value = false
        toast.info('변경 취소됨')
    }
}

async function deleteWeek() {
    if (!selectedWeekKey.value) return
    const confirmed = await modal.confirm({
        title: '데이터 삭제',
        message: `'${selectedWeekKey.value}' 데이터를 정말 삭제하시겠습니까?`,
        confirmText: '삭제',
        variant: 'destructive'
    })
    if (!confirmed) return
    
    isSaving.value = true
    try {
        delete store.app.weeks[selectedWeekKey.value]
        selectedWeekKey.value = weekKeys.value[0] || null
        toast.success('삭제됨')
    } finally {
        isSaving.value = false
    }
}
</script>

<template>
  <div class="rounded-xl border border-border/50 bg-background shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px]">
    
    <!-- Sidebar: Week List -->
    <div class="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/50 flex flex-col bg-muted/10">
        <div class="p-3 border-b border-border/50">
             <div class="relative">
                 <Icon name="MagnifyingGlassIcon" :size="14" class="absolute left-2.5 top-2.5 text-muted-foreground" />
                 <input 
                    type="text" 
                    v-model="searchTerm" 
                    placeholder="주차 검색..." 
                    class="w-full bg-background border border-border/50 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                 />
             </div>
        </div>
        <div class="flex-1 overflow-y-auto">
            <button
                v-for="key in filteredWeeks"
                :key="key"
                @click="selectedWeekKey = key"
                :class="clsx(
                    'w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-colors border-l-2',
                    selectedWeekKey === key 
                        ? 'bg-background border-primary text-primary font-medium shadow-sm' 
                        : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )"
            >
                <Icon name="CalendarDaysIcon" :size="14" :class="selectedWeekKey === key ? 'text-primary' : 'opacity-70'" />
                {{ key }}
            </button>
            <div v-if="filteredWeeks.length === 0" class="p-8 text-center text-xs text-muted-foreground opacity-70">
                검색 결과 없음
            </div>
        </div>
        <div class="p-3 bg-muted/30 border-t border-border/50 text-xs text-center text-muted-foreground">
            {{ filteredWeeks.length }} items
        </div>
    </div>

    <!-- Main Editor -->
    <div class="flex-1 flex flex-col h-full bg-[#282c34] relative">
        <div v-if="selectedWeekKey" class="flex flex-col h-full"> 
            <!-- Toolbar -->
            <div class="flex items-center justify-between p-3 border-b border-border/10 bg-[#21252b] text-gray-300">
                <div class="flex items-center gap-3">
                    <h3 class="font-mono text-sm font-bold flex items-center gap-2">
                        <Icon name="DocumentTextIcon" class="text-blue-400" :size="14" />
                        {{ selectedWeekKey }}.json
                    </h3>
                    <Badge v-if="weeksDirty" variant="outline" class="border-amber-500/50 text-amber-500 bg-amber-500/10 text-[10px] h-5 px-1.5">
                        Modified
                    </Badge>
                </div>
                
                <div class="flex items-center gap-2">
                    <button 
                        v-if="weeksDirty" 
                        @click="resetWeek" 
                        class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
                    >
                        Discard
                    </button>
                    <Button 
                        size="sm" 
                        class="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white border-none" 
                        @click="saveWeek" 
                        :disabled="!weeksDirty || isSaving"
                    >
                        <Icon v-if="isSaving" name="ArrowPathIcon" class="mr-1.5 animate-spin" :size="12" />
                        <Icon v-else name="CheckIcon" class="mr-1.5" :size="12" />
                        {{ isSaving ? 'Saving...' : 'Save Changes' }}
                    </Button>
                    <div class="w-px h-4 bg-gray-700 mx-1"></div>
                    <button 
                        @click="deleteWeek" 
                        class="text-gray-400 hover:text-red-400 p-1.5 rounded-md transition-colors"
                        title="Delete File"
                        :disabled="isSaving"
                    >
                        <Icon name="TrashIcon" :size="14" />
                    </button>
                </div>
            </div>

            <!-- CodeMirror Editor -->
            <div class="flex-1 overflow-hidden relative">
                <Codemirror
                    v-model="weekJsonText"
                    placeholder="JSON content here..."
                    :style="{ height: '100%', fontSize: '13px', fontFamily: '\'JetBrains Mono\', monospace' }"
                    :autofocus="true"
                    :indent-with-tab="true"
                    :tab-size="2"
                    :extensions="extensions"
                    @change="handleChange"
                />
            </div>
            
            <!-- Footer Status -->
            <div class="bg-[#21252b] border-t border-border/10 px-3 py-1.5 text-[10px] text-gray-500 flex justify-between items-center select-none">
                 <span>Ln {{ weekJsonText.split('\n').length }}, Col 1</span>
                 <div class="flex items-center gap-3">
                    <span>UTF-8</span>
                    <span>JSON</span>
                 </div>
            </div>
        </div>
        
        <!-- Empty State -->
        <div v-else class="flex-1 flex items-center justify-center text-gray-500 bg-[#282c34] flex-col gap-2">
            <Icon name="CodeBracketSquareIcon" :size="48" class="opacity-20" />
            <p class="text-sm">Select a file to edit</p>
        </div>
    </div>
  </div>
</template>

<style>
/* CodeMirror Custom Overrides */
.cm-editor {
    height: 100%;
    background-color: #282c34 !important;
}
.cm-scroller {
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace !important;
}
/* Scrollbar for editor */
.cm-scroller::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.cm-scroller::-webkit-scrollbar-track {
  background: #21252b; 
}
.cm-scroller::-webkit-scrollbar-thumb {
  background: #4b5563; 
  border-radius: 5px;
}
.cm-scroller::-webkit-scrollbar-thumb:hover {
  background: #6b7280; 
}
</style>
