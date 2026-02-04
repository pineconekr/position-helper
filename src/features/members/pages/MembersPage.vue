<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAssignmentStore } from '@/stores/assignment'
import { useStats } from '@/features/stats/composables/useStats'
import MembersTable, { type MemberWithStats } from '../components/MembersTable.vue'
import MemberDialog from '../components/MemberDialog.vue'
import Icon from '@/components/ui/Icon.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MembersEntry } from '@/shared/types'
import { toast } from 'vue-sonner'
import { modal } from '@/shared/composables/useModal'

const store = useAssignmentStore()
const { stats } = useStats()

// --- State ---
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const isDialogOpen = ref(false)
const selectedMember = ref<MembersEntry | null>(null)

// --- Data Processing ---
const enrichedMembers = computed<MemberWithStats[]>(() => {
  const countMap = new Map<string, number>()
  stats.value.workloadRanking.forEach((i: { name: string; value: number }) => countMap.set(i.name, i.value))
  
  const absenceMap = new Map<string, number>()
  stats.value.absenceRanking.forEach((i: { name: string; value: number }) => absenceMap.set(i.name, i.value))

  return store.app.members.map(m => ({
    ...m,
    assignmentCount: countMap.get(m.name) ?? 0,
    absenceCount: absenceMap.get(m.name) ?? 0
  }))
})

// --- Filtering Logic ---
const filteredMembers = computed(() => {
  let list = enrichedMembers.value
  
  // 1. Status Filter
  if (statusFilter.value === 'active') {
    list = list.filter(m => m.active)
  } else if (statusFilter.value === 'inactive') {
    list = list.filter(m => !m.active)
  }

  // 2. Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m => 
       m.name.toLowerCase().includes(q) || 
       String(m.generation).includes(q) ||
       m.notes?.toLowerCase().includes(q)
    )
  }
  
  return list
})

// --- Actions ---
const handleEdit = (member: MembersEntry) => {
  selectedMember.value = member
  isDialogOpen.value = true
}

const handleAdd = () => {
    selectedMember.value = null
    isDialogOpen.value = true
}

const handleSave = (member: MembersEntry) => {
    if (selectedMember.value) { // Edit
        const oldName = selectedMember.value.name
        if (oldName !== member.name && store.app.members.some(m => m.name === member.name)) {
            modal.alert({ title: '중복 오류', message: '이미 존재하는 이름입니다.', variant: 'warning' })
            return
        }
        const idx = store.app.members.findIndex(m => m.name === oldName)
        if (idx !== -1) {
             const newMembers = [...store.app.members]
             newMembers[idx] = member
             store.setMembers(newMembers)
             toast.success('멤버 정보가 수정되었습니다.')
        }
    } else { // Add
         if (store.app.members.find(m => m.name === member.name)) {
             modal.alert({ title: '중복 오류', message: '이미 존재하는 이름입니다.', variant: 'warning' })
             return
         }
         store.setMembers([...store.app.members, member])
         toast.success('새로운 멤버가 등록되었습니다.')
    }
}

const handleToggleActive = (name: string, _active: boolean) => {
    store.toggleMemberActive(name)
    toast.info(`상태가 변경되었습니다.`)
}

const handleBulkActive = (names: string[], active: boolean) => {
    store.setMembersActive(names, active)
    toast.success(`${names.length}명의 상태가 ${active ? '활동' : '비활성'}으로 변경되었습니다.`)
}

</script>

<template>
  <div class="container mx-auto max-w-7xl py-8 space-y-6">
    
    <!-- 1. Header & Actions (Operational Layout) -->
    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center px-1">
       <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">멤버</h1>
          <p class="text-sm text-muted-foreground mt-1">팀원들의 역할 분담 현황을 관리합니다.</p>
       </div>
       <Button @click="handleAdd" class="shadow-sm h-9 px-4 text-xs font-semibold">
          <Icon name="UserPlusIcon" :size="14" class="mr-2" />
          멤버 등록
       </Button>
    </div>

    <!-- 2. Toolbar (Search & Filter) -->
    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-card p-1 rounded-lg border border-border/60">
        <!-- Search -->
        <div class="relative flex-1">
           <Icon name="MagnifyingGlassIcon" :size="14" class="absolute left-3 top-2.5 text-muted-foreground" />
           <Input 
             v-model="searchQuery" 
             placeholder="검색 (이름, 기수, 메모)..." 
             class="pl-9 h-9 border-none shadow-none focus-visible:ring-0 bg-transparent text-sm"
           />
        </div>
        
        <div class="h-5 w-px bg-border hidden sm:block"></div>

        <!-- Filter Group -->
        <div class="flex items-center gap-2 px-2">
             <div class="flex gap-1 bg-muted/40 p-1 rounded-md">
                <button 
                  @click="statusFilter = 'all'"
                  class="px-3 py-1 text-xs font-medium rounded-[4px] transition-all"
                  :class="statusFilter === 'all' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
                >
                  전체
                </button>
                <button 
                  @click="statusFilter = 'active'"
                  class="px-3 py-1 text-xs font-medium rounded-[4px] transition-all"
                  :class="statusFilter === 'active' ? 'bg-background shadow-sm text-green-600' : 'text-muted-foreground hover:text-foreground'"
                >
                  활동중
                </button>
                <button 
                  @click="statusFilter = 'inactive'"
                  class="px-3 py-1 text-xs font-medium rounded-[4px] transition-all"
                  :class="statusFilter === 'inactive' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
                >
                  비활동
                </button>
             </div>
        </div>
    </div>

    <!-- 3. Data Table (The Core Operational Space) -->
    <div class="shadow-sm">
       <MembersTable 
         :members="filteredMembers" 
         @update:active="handleToggleActive"
         @bulk:active="handleBulkActive"
         @edit="handleEdit"
       />
    </div>

    <!-- Dialog -->
    <MemberDialog 
       v-model:open="isDialogOpen"
       :member="selectedMember"
       @save="handleSave"
     />

  </div>
</template>
