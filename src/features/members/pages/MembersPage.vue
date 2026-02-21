<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useAssignmentStore } from '@/stores/assignment'
import { useStats } from '@/features/stats/composables/useStats'
import { modal } from '@/shared/composables/useModal'
import type { MembersEntry } from '@/shared/types'
import { getDisplayName, getMemberGeneration } from '@/shared/utils/member-registry'
import MembersTable, { type MemberWithStats } from '../components/MembersTable.vue'
import MemberDialog from '../components/MemberDialog.vue'
import Icon from '@/components/ui/Icon.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const store = useAssignmentStore()
const { stats } = useStats()

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const isDialogOpen = ref(false)
const selectedMember = ref<MembersEntry | null>(null)

const normalizeKey = (value: string) => value.trim().toLowerCase()
const normalizeText = (value?: string) => value?.trim().toLowerCase() ?? ''

function sanitizeMember(member: MembersEntry): MembersEntry {
  return {
    ...member,
    name: member.name.trim(),
    generation: Number.isFinite(member.generation) ? Math.max(0, Math.trunc(member.generation)) : 0,
    notes: member.notes?.trim() || undefined,
  }
}

function hasDuplicateName(name: string, excludeName?: string) {
  const target = normalizeKey(name)
  const exclude = excludeName ? normalizeKey(excludeName) : null
  return store.app.members.some((member) => {
    const key = normalizeKey(member.name)
    if (exclude && key === exclude) return false
    return key === target
  })
}

const enrichedMembers = computed<MemberWithStats[]>(() => {
  const countMap = new Map<string, number>()
  stats.value.workloadRanking.forEach((item: { name: string; value: number }) => countMap.set(item.name, item.value))

  const absenceMap = new Map<string, number>()
  stats.value.absenceRanking.forEach((item: { name: string; value: number }) => absenceMap.set(item.name, item.value))

  return store.app.members.map((member) => ({
    ...member,
    assignmentCount: countMap.get(member.name) ?? 0,
    absenceCount: absenceMap.get(member.name) ?? 0,
  }))
})

const filteredMembers = computed(() => {
  let list = enrichedMembers.value

  if (statusFilter.value === 'active') {
    list = list.filter((member) => member.active)
  } else if (statusFilter.value === 'inactive') {
    list = list.filter((member) => !member.active)
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.trim().toLowerCase()
    list = list.filter((member) =>
      getDisplayName(member).toLowerCase().includes(query) ||
      String(getMemberGeneration(member) ?? '').includes(query) ||
      normalizeText(member.notes).includes(query),
    )
  }

  return list
})

const totalCount = computed(() => enrichedMembers.value.length)
const activeCount = computed(() => enrichedMembers.value.filter((member) => member.active).length)
const inactiveCount = computed(() => totalCount.value - activeCount.value)

function handleEdit(member: MembersEntry) {
  selectedMember.value = member
  isDialogOpen.value = true
}

function handleAdd() {
  selectedMember.value = null
  isDialogOpen.value = true
}

function handleSave(member: MembersEntry) {
  const normalizedMember = sanitizeMember(member)

  if (selectedMember.value) {
    const oldName = selectedMember.value.name
    if (hasDuplicateName(normalizedMember.name, oldName)) {
      modal.alert({ title: '중복 오류', message: '이미 존재하는 이름입니다.', variant: 'warning' })
      return
    }

    const index = store.app.members.findIndex((item) => item.name === oldName)
    if (index === -1) return

    const nextMembers = [...store.app.members]
    nextMembers[index] = normalizedMember
    store.setMembers(nextMembers)
    toast.success('멤버 정보가 수정되었습니다.')
    return
  }

  if (hasDuplicateName(normalizedMember.name)) {
    modal.alert({ title: '중복 오류', message: '이미 존재하는 이름입니다.', variant: 'warning' })
    return
  }

  store.setMembers([...store.app.members, normalizedMember])
  toast.success('새 멤버를 등록했습니다.')
}

function handleToggleActive(name: string, _active: boolean) {
  store.toggleMemberActive(name)
  toast.info('활동 상태를 변경했습니다.')
}

function handleBulkActive(names: string[], active: boolean) {
  const updatedCount = store.setMembersActive(names, active)
  if (updatedCount > 0) {
    toast.success(`${updatedCount}명의 상태를 ${active ? '활동' : '비활동'}으로 변경했습니다.`)
  }
}
</script>

<template>
  <div class="space-y-4">
    <section class="surface-panel px-4 py-4 sm:px-6 sm:py-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1.5">
          <p class="section-eyebrow">Members</p>
          <h1 class="section-title">팀원 관리</h1>
          <p class="section-description">배정 운영에 사용되는 멤버 프로필, 활동 상태, 기본 메모를 관리합니다.</p>
        </div>
        <Button @click="handleAdd" class="h-10 w-full px-4 text-sm font-semibold sm:w-auto">
          <Icon name="UserPlusIcon" :size="16" class="mr-2" />
          멤버 추가
        </Button>
      </div>
    </section>

    <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      <Card class="border-border/75 bg-card/92">
        <CardContent class="p-4">
          <p class="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">전체 멤버</p>
          <p class="stat-number mt-1 text-2xl text-foreground">{{ totalCount }}</p>
        </CardContent>
      </Card>
      <Card class="border-border/75 bg-card/92">
        <CardContent class="p-4">
          <p class="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">활동 멤버</p>
          <p class="stat-number mt-1 text-2xl text-foreground">{{ activeCount }}</p>
        </CardContent>
      </Card>
      <Card class="border-border/75 bg-card/92">
        <CardContent class="p-4">
          <p class="text-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">비활동 멤버</p>
          <p class="stat-number mt-1 text-2xl text-foreground">{{ inactiveCount }}</p>
        </CardContent>
      </Card>
    </div>

    <Card class="border-border/75 bg-card/92">
      <CardContent class="space-y-4 p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="relative w-full lg:max-w-md">
            <Icon name="MagnifyingGlassIcon" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="이름, 기수, 메모 검색"
              class="h-10 pl-9"
            />
          </div>

          <div class="flex flex-wrap items-center gap-1 rounded-full border border-border/70 bg-muted/40 p-1 sm:flex-nowrap">
            <button
              type="button"
              @click="statusFilter = 'all'"
              :class="statusFilter === 'all' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              class="min-w-[66px] rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            >
              전체
            </button>
            <button
              type="button"
              @click="statusFilter = 'active'"
              :class="statusFilter === 'active' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              class="min-w-[66px] rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            >
              활동
            </button>
            <button
              type="button"
              @click="statusFilter = 'inactive'"
              :class="statusFilter === 'inactive' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              class="min-w-[66px] rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            >
              비활동
            </button>
          </div>
        </div>

        <MembersTable
          :members="filteredMembers"
          @update:active="handleToggleActive"
          @bulk:active="handleBulkActive"
          @edit="handleEdit"
        />
      </CardContent>
    </Card>

    <MemberDialog
      v-model:open="isDialogOpen"
      :member="selectedMember"
      @save="handleSave"
    />
  </div>
</template>

