<script setup lang="ts">
/**
 * MembersPage.vue - 팀원 관리 페이지
 */
import { ref, computed, watch, h, type Ref } from 'vue'
import type { Updater } from '@tanstack/vue-table'
import { useAssignmentStore } from '@/stores/assignment'
import Modal from '@/components/common/Modal.vue'
import ActivityFeed from '@/shared/components/common/ActivityFeed.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import Icon from '@/components/ui/Icon.vue'
import { type MembersEntry } from '@/shared/types'
import { stripCohort, extractCohort } from '@/shared/utils/assignment'
import clsx from 'clsx'
import { 
  FlexRender,
  getCoreRowModel,
  useVueTable,
  type ColumnDef,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/vue-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const store = useAssignmentStore()

// State
const searchTerm = ref('')
const filter = ref<'all' | 'active' | 'inactive'>('all')
const isModalOpen = ref(false)
const editingMember = ref<MembersEntry | null>(null)
const deletingMember = ref<MembersEntry | null>(null)

// Form state
const formName = ref('')
const formNotes = ref('')
const formActive = ref(true)
const formError = ref('')

// Watch for modal open
watch([isModalOpen, editingMember], () => {
  if (isModalOpen.value) {
    formName.value = editingMember.value?.name || ''
    formNotes.value = editingMember.value?.notes || ''
    formActive.value = editingMember.value?.active ?? true
    formError.value = ''
  }
})

// Computed
const members = computed(() => store.app.members)

const membersWithGen = computed(() => 
  members.value.map(m => ({
    ...m,
    generation: extractCohort(m.name),
    displayName: stripCohort(m.name)
  }))
)

const filteredMembers = computed(() => {
  const lowerQuery = searchTerm.value.toLowerCase()
  return membersWithGen.value.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(lowerQuery) ||
      m.notes?.toLowerCase().includes(lowerQuery)
    const matchesFilter = filter.value === 'all'
      ? true
      : filter.value === 'active' ? m.active : !m.active
    return matchesSearch && matchesFilter
  })
})

const generationStats = computed(() => {
  const stats = new Map<number, number>()
  let unknown = 0
  membersWithGen.value.forEach(m => {
    if (m.active) {
      if (m.generation) {
        stats.set(m.generation, (stats.get(m.generation) || 0) + 1)
      } else {
        unknown++
      }
    }
  })
  const sorted = Array.from(stats.entries()).sort((a, b) => b[0] - a[0])
  return { sorted, unknown }
})

const activeCount = computed(() => members.value.filter(m => m.active).length)
const maxGenCount = computed(() => Math.max(1, ...generationStats.value.sorted.map(s => s[1])))

// Table Setup
type MemberWithGen = typeof membersWithGen.value[0]

const sorting = ref<SortingState>([])

const columns = computed<ColumnDef<MemberWithGen>[]>(() => [
  {
    accessorKey: 'generation',
    header: () => h('div', { class: 'text-center w-14' }, '기수'),
    cell: ({ row }) => {
      const gen = row.original.generation
      return h('div', { class: 'text-center' }, 
        gen 
          ? h('span', { class: 'text-sm font-mono text-[var(--color-label-secondary)]' }, gen)
          : h('span', { class: 'text-[var(--color-label-tertiary)]' }, '-')
      )
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return h(Button, {
        variant: 'ghost',
        class: '-ml-4 h-8 data-[state=open]:bg-accent',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['이름', h(Icon, { name: 'unfold_more', size: 12, class: 'ml-2' })])
    },
    cell: ({ row }) => {
      const member = row.original
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', {
          class: clsx(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-[var(--color-border-subtle)]',
            member.generation
              ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
              : 'bg-[var(--color-surface-elevated)] text-[var(--color-label-secondary)]'
          )
        }, member.displayName.charAt(0)),
        h('div', { class: 'flex flex-col' }, [
          h('span', { class: 'text-base font-medium text-[var(--color-label-primary)]' }, member.displayName),
          member.notes ? h('span', { class: 'text-xs text-[var(--color-label-tertiary)] truncate max-w-[var(--truncate-max-width)]' }, member.notes) : null
        ])
      ])
    }
  },
  {
    accessorKey: 'active',
    header: () => h('div', { class: 'text-center w-20' }, '상태'),
    cell: ({ row }) => {
      return h('div', { class: 'text-center' }, 
        h('div', {
          class: clsx(
            'inline-block w-2 h-2 rounded-full',
            row.original.active ? 'bg-[var(--color-success)]' : 'bg-[var(--color-label-tertiary)]'
          )
        })
      )
    }
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'w-16' }),
    cell: ({ row }) => {
      const member = row.original
      return h('div', { class: 'flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity' }, [
        h('button', {
          onClick: () => openEditModal(member),
          class: 'p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-accent)] rounded-[4px] hover:bg-[var(--color-surface-elevated)]',
        }, h(Icon, { name: 'edit', size: 14 })),
        h('button', {
          onClick: () => { deletingMember.value = member },
          class: 'p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-danger)] rounded-[4px] hover:bg-[var(--color-surface-elevated)]',
        }, h(Icon, { name: 'delete', size: 14 }))
      ])
    }
  }
])

const table = useVueTable({
  get data() { return filteredMembers.value },
  get columns() { return columns.value },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  state: {
    get sorting() { return sorting.value },
  },
})

function valueUpdater<T extends Updater<any>>(updaterOrValue: T, ref: Ref) {
  ref.value = typeof updaterOrValue === 'function'
    ? updaterOrValue(ref.value)
    : updaterOrValue
}

// Actions
function handleSubmit() {
  const trimmedName = formName.value.trim()
  const trimmedNotes = formNotes.value.trim()
  const existingNames = members.value.map(m => m.name)

  if (!trimmedName) {
    formError.value = '이름을 입력해주세요.'
    return
  }

  if (!editingMember.value && existingNames.includes(trimmedName)) {
    formError.value = '이미 등록된 이름입니다.'
    return
  }

  if (editingMember.value) {
    // Edit
    const updatedMembers = members.value.map(m =>
      m.name === editingMember.value!.name
        ? { ...m, name: trimmedName, notes: trimmedNotes || undefined, active: formActive.value }
        : m
    )
    store.setMembers(updatedMembers)
  } else {
    // Add
    store.setMembers([...members.value, { name: trimmedName, notes: trimmedNotes || undefined, active: formActive.value }])
  }
  
  closeModal()
}

function handleDelete() {
  if (!deletingMember.value) return
  store.setMembers(members.value.filter(m => m.name !== deletingMember.value!.name))
  deletingMember.value = null
}

function openAddModal() {
  editingMember.value = null
  isModalOpen.value = true
}

function openEditModal(member: MembersEntry) {
  editingMember.value = member
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  editingMember.value = null
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold tracking-tight text-[var(--color-label-primary)]">팀원 관리</h1>
        <p class="mt-1 text-sm text-[var(--color-label-secondary)]">
          전체 {{ members.length }}명 관리 중
        </p>
      </div>
      <Button variant="default" @click="openAddModal" class="w-full sm:w-auto">
        <Icon name="add" class="mr-2" :size="16" />
        팀원 추가
      </Button>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: Member List -->
      <div class="lg:col-span-2 space-y-4">
        <!-- Filters & Search -->
        <div class="flex flex-col sm:flex-row gap-3 justify-between p-1">
          <div class="flex p-0.5 bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-[var(--radius-sm)] shrink-0">
            <button
              v-for="f in (['all', 'active', 'inactive'] as const)"
              :key="f"
              @click="filter = f"
              :class="clsx(
                'btn-interactive px-3 py-1 text-sm font-medium rounded-[4px]',
                filter === f
                  ? 'bg-[var(--color-surface)] text-[var(--color-label-primary)] shadow-sm ring-1 ring-black/5'
                  : 'text-[var(--color-label-secondary)] hover:text-[var(--color-label-primary)]'
              )"
            >
              {{ f === 'all' ? '전체' : f === 'active' ? '활동 중' : '비활동' }}
            </button>
          </div>
          <div class="relative w-full sm:w-64">
            <div class="relative">
              <Icon name="search" :size="14" class="absolute left-2.5 top-2.5 text-muted-foreground z-10" />
              <Input
                v-model="searchTerm"
                placeholder="이름 검색..."
                class="w-full pl-8"
              />
            </div>
          </div>
        </div>

        <!-- Member Table (shadcn Data Table) -->
        <div class="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
          <Table>
            <TableHeader class="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
              <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="border-0 hover:bg-transparent">
                <TableHead v-for="header in headerGroup.headers" :key="header.id" :class="clsx('text-xs font-semibold text-[var(--color-label-tertiary)] uppercase tracking-wider h-10', header.column.id === 'generation' ? 'text-center' : '')">
                  <FlexRender
                    v-if="!header.isPlaceholder"
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="table.getRowModel().rows?.length">
                <TableRow
                  v-for="row in table.getRowModel().rows"
                  :key="row.id"
                  :data-state="row.getIsSelected() ? 'selected' : undefined"
                  :class="clsx(
                    'group transition-colors hover:bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] last:border-0',
                    !row.original.active && 'opacity-60'
                  )"
                >
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="py-2.5">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>
              <TableRow v-else>
                <TableCell colspan="4" class="h-24 text-center py-12">
                   <div class="flex flex-col items-center justify-center gap-2">
                    <div class="w-10 h-10 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center">
                      <Icon name="person_off" :size="20" class="text-[var(--color-label-tertiary)]" />
                    </div>
                    <p class="text-sm text-[var(--color-label-secondary)]">
                      {{ searchTerm ? '검색 결과가 없습니다' : '조건에 맞는 팀원이 없습니다' }}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- Right: Sidebar -->
      <div class="space-y-5">
        <!-- Status Overview -->
        <Card class="border-2 border-[var(--color-accent)]/20 relative overflow-hidden">
          <CardContent class="p-4">
          <div class="absolute inset-0 bg-[var(--color-accent)]/5" />
          <div class="relative z-10">
            <h3 class="text-[var(--color-accent)] text-sm font-semibold uppercase tracking-wide mb-3">활동 현황</h3>
            <div class="flex items-end gap-2 mb-2">
              <span class="text-3xl font-bold tracking-tight text-[var(--color-label-primary)]">{{ activeCount }}</span>
              <span class="text-[var(--color-label-secondary)] text-sm mb-1">/ {{ members.length }}명</span>
            </div>
            <div class="w-full bg-[var(--color-surface)] h-1.5 rounded-full overflow-hidden">
              <div
                class="bg-[var(--color-accent)] h-full rounded-full transition-all duration-1000"
                :style="{ width: `${members.length > 0 ? (activeCount / members.length) * 100 : 0}%` }"
              />
            </div>
          </div>
          </CardContent>
        </Card>

        <!-- Generation Distribution -->
        <Card>
          <CardContent class="p-4">
          <h3 class="text-base font-medium text-[var(--color-label-primary)] mb-3 flex items-center gap-2">
            <Icon name="groups" :size="16" class="text-[var(--color-label-tertiary)]" />
            기수별 분포
          </h3>
          <div class="space-y-2">
            <div
              v-for="([gen, count], idx) in generationStats.sorted"
              :key="gen"
              class="flex items-center gap-3 text-sm"
            >
              <div class="w-8 font-mono text-[var(--color-label-secondary)] text-right">{{ gen }}기</div>
              <div class="flex-1 h-1.5 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
                <div
                  :class="`h-full rounded-full ${idx === 0 ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-label-tertiary)]'}`"
                  :style="{ width: `${(count / maxGenCount) * 100}%` }"
                />
              </div>
              <div class="w-4 text-right font-medium text-[var(--color-label-primary)]">{{ count }}</div>
            </div>
            <div
              v-if="generationStats.unknown > 0"
              class="flex items-center gap-3 text-xs pt-2 border-t border-[var(--color-border-subtle)]"
            >
              <div class="w-8 text-[var(--color-label-tertiary)] text-right">-</div>
              <div class="flex-1 text-[var(--color-label-tertiary)] text-xs">기수 미확인</div>
              <div class="w-4 text-right font-medium text-[var(--color-label-secondary)]">{{ generationStats.unknown }}</div>
            </div>
          </div>
          </CardContent>
        </Card>

        <!-- Activity Feed -->
        <ActivityFeed
          title="변경 내역"
          :filter="['member']"
          emptyMessage="최근 변경 사항 없음"
        />
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Modal
      :title="editingMember ? '팀원 정보 수정' : '새 팀원 추가'"
      :open="isModalOpen"
      @close="closeModal"
      size="md"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">이름 (예: 20 홍길동)</label>
          <Input
            v-model="formName"
            placeholder="기수와 이름을 입력하세요"
          />
          <span v-if="formError" class="text-xs text-[var(--color-danger)] mt-1">{{ formError }}</span>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">메모</label>
          <Textarea
            v-model="formNotes"
            placeholder="특이사항이나 역할을 메모하세요 (선택)"
            class="min-h-[var(--input-min-height)]"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-[var(--color-label-secondary)] ml-0.5">상태</label>
          <button
            type="button"
            @click="formActive = !formActive"
            :class="clsx(
              'card-interactive w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)]',
              'border text-left',
              'bg-[var(--color-surface)] border-[var(--color-border-subtle)]'
            )"
          >
            <div :class="clsx(
              'w-9 h-5 rounded-full relative transition-colors shrink-0',
              formActive ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-label-tertiary)]'
            )">
              <div :class="clsx(
                'w-4 h-4 rounded-full bg-[var(--color-surface-elevated)] dark:bg-zinc-200 absolute top-0.5 transition-all shadow-sm',
                formActive ? 'left-[18px]' : 'left-[2px]'
              )" />
            </div>
            <div>
              <div class="text-base font-medium text-[var(--color-label-primary)]">
                {{ formActive ? '활동 중' : '비활동' }}
              </div>
              <div class="text-xs text-[var(--color-label-tertiary)]">
                {{ formActive ? '스케줄링 포함' : '명단 유지, 스케줄링 제외' }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeModal">취소</Button>
        <Button variant="default" @click="handleSubmit">
          {{ editingMember ? '저장' : '추가' }}
        </Button>
      </template>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal
      title="팀원 삭제"
      :open="!!deletingMember"
      @close="deletingMember = null"
      size="sm"
    >
      <Alert variant="destructive">
        <Icon name="warning" :size="20" />
        <AlertTitle class="ml-2">정말 삭제하시겠습니까?</AlertTitle>
        <AlertDescription class="ml-2 mt-1">
          <strong>{{ deletingMember?.name }}</strong>님의 데이터가 영구적으로 삭제됩니다.
        </AlertDescription>
      </Alert>

      <template #footer>
        <Button variant="ghost" @click="deletingMember = null">취소</Button>
        <Button variant="destructive" @click="handleDelete">삭제하기</Button>
      </template>
    </Modal>
  </div>
</template>
