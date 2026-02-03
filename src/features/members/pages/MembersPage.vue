<script setup lang="ts">
/**
 * MembersPage.vue - 팀원 관리 페이지
 */
import { ref, computed, watch, h, type Ref } from 'vue'
import type { Updater } from '@tanstack/vue-table'
import { useAssignmentStore } from '@/stores/assignment'
import Modal from '@/components/common/Modal.vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
  type Column,
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
    generation: m.generation ?? extractCohort(m.name) ?? undefined,
    displayName: stripCohort(m.name)
  }))
)

const filteredMembers = computed(() => {
  const lowerQuery = searchTerm.value.toLowerCase()
  return membersWithGen.value.filter(m => {
    return m.name.toLowerCase().includes(lowerQuery) ||
      m.notes?.toLowerCase().includes(lowerQuery)
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

// Table Setup
type MemberWithGen = typeof membersWithGen.value[0]

const sorting = ref<SortingState>([])

/**
 * 컨럼의 현재 정렬 상태에 따라 아이콘 정보를 반환
 * @param column - TanStack Table 컨럼 객체
 * @returns 아이콘 이름과 CSS 클래스
 */
function getSortIcon(column: Column<MemberWithGen, unknown>) {
  const sortState = column.getIsSorted()
  if (sortState === 'asc') return { name: 'ChevronUpIcon', class: 'ml-1.5 text-[var(--color-accent)]' }
  if (sortState === 'desc') return { name: 'ChevronDownIcon', class: 'ml-1.5 text-[var(--color-accent)]' }
  return { name: 'ChevronUpDownIcon', class: 'ml-1.5 text-[var(--color-label-tertiary)]' }
}

// 컬럼 정의 - 정적 배열로 정의하여 불필요한 재생성 방지
const columns: ColumnDef<MemberWithGen>[] = [
  {
    accessorKey: 'generation',
    header: ({ column }) => {
      const icon = getSortIcon(column)
      return h(Button, {
        variant: 'ghost',
        class: 'h-8 data-[state=open]:bg-accent w-full justify-center',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [
        '기수', 
        h('span', { class: 'w-5 inline-flex justify-center' }, 
          h(Icon, { name: icon.name, size: 14, class: icon.class })
        )
      ])
    },
    cell: ({ row }) => {
      const gen = row.original.generation
      return h('div', { class: 'text-center' }, 
        gen 
          ? h('span', { class: 'text-sm font-mono text-[var(--color-label-secondary)]' }, gen)
          : h('span', { class: 'text-[var(--color-label-tertiary)]' }, '-')
      )
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.generation ?? 0
      const b = rowB.original.generation ?? 0
      return a - b
    },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const icon = getSortIcon(column)
      return h(Button, {
        variant: 'ghost',
        class: '-ml-4 h-8 data-[state=open]:bg-accent',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [
        '이름', 
        h('span', { class: 'w-5 inline-flex justify-center' }, 
          h(Icon, { name: icon.name, size: 14, class: icon.class })
        )
      ])
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
    header: ({ column }) => {
      const icon = getSortIcon(column)
      return h(Button, {
        variant: 'ghost',
        class: 'h-8 data-[state=open]:bg-accent w-full justify-center',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [
        '상태', 
        h('span', { class: 'w-5 inline-flex justify-center' }, 
          h(Icon, { name: icon.name, size: 14, class: icon.class })
        )
      ])
    },
    cell: ({ row }) => {
      const isActive = row.original.active
      return h('div', { class: 'flex items-center justify-center gap-1.5' }, [
        h('div', {
          class: clsx(
            'w-2 h-2 rounded-full',
            isActive ? 'bg-[var(--color-success)]' : 'bg-[var(--color-label-tertiary)]'
          )
        }),
        h('span', { class: 'text-xs text-[var(--color-label-secondary)]' }, isActive ? '활동' : '비활동')
      ])
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.active ? 1 : 0
      const b = rowB.original.active ? 1 : 0
      return a - b
    },
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
        }, h(Icon, { name: 'PencilIcon', size: 14 })),
        h('button', {
          onClick: () => { deletingMember.value = member },
          class: 'p-1 text-[var(--color-label-secondary)] hover:text-[var(--color-danger)] rounded-[4px] hover:bg-[var(--color-surface-elevated)]',
        }, h(Icon, { name: 'TrashIcon', size: 14 }))
      ])
    }
  }
]

const table = useVueTable({
  get data() { return filteredMembers.value },
  columns, // 정적 배열 직접 참조
  getRowId: (row) => row.name, // 안정적인 row ID 사용
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

function openEditModal(member: MembersEntry & { displayName?: string }) {
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
    <!-- Page Header with Stats -->
    <div class="space-y-4">
      <!-- Title Row -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-foreground">팀원 관리</h1>
        </div>
        <div class="flex items-center gap-3">
          <!-- 검색창 -->
          <div class="relative w-full sm:w-56">
            <Icon name="MagnifyingGlassIcon" :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" aria-hidden="true" />
            <Input
              v-model="searchTerm"
              placeholder="이름 검색..."
              class="w-full pl-9 h-10"
              aria-label="팀원 이름 검색"
            />
          </div>
          <!-- 추가 버튼 -->
          <Button variant="default" @click="openAddModal" class="shrink-0 h-10">
            <Icon name="PlusIcon" :size="16" aria-hidden="true" />
            <span class="hidden sm:inline ml-1.5">팀원 추가</span>
          </Button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <!-- 전체 팀원 -->
        <div class="bg-card border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs font-medium text-muted-foreground">전체 팀원</p>
          <p class="text-2xl font-bold text-foreground">{{ members.length }}<span class="text-sm font-medium text-muted-foreground ml-1">명</span></p>
        </div>
        <!-- 활동 중 -->
        <div class="bg-card border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs font-medium text-muted-foreground">활동 중</p>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-bold text-primary">{{ activeCount }}<span class="text-sm font-medium text-muted-foreground ml-1">명</span></p>
            <span class="text-xs text-muted-foreground">({{ members.length ? Math.round(activeCount / members.length * 100) : 0 }}%)</span>
          </div>
        </div>
        <!-- 비활동 -->
        <div class="bg-card border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs font-medium text-muted-foreground">비활동</p>
          <p class="text-2xl font-bold text-muted-foreground">{{ members.length - activeCount }}<span class="text-sm font-medium text-muted-foreground ml-1">명</span></p>
        </div>
        <!-- 기수 수 -->
        <div class="bg-card border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs font-medium text-muted-foreground">등록된 기수</p>
          <p class="text-2xl font-bold text-foreground">{{ generationStats.sorted.length }}<span class="text-sm font-medium text-muted-foreground ml-1">개</span></p>
        </div>
      </div>
    </div>

    <!-- 기수별 분포 - Tag Cloud -->
    <div 
      v-if="generationStats.sorted.length > 0 || generationStats.unknown > 0"
      class="bg-card border border-border rounded-xl p-4"
      role="region"
      aria-label="기수별 팀원 분포"
    >
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-semibold text-foreground">기수별 분포</h2>
        <button
          v-if="searchTerm"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          @click="searchTerm = ''"
          aria-label="필터 해제"
        >
          <Icon name="XMarkIcon" :size="12" aria-hidden="true" />
          <span>필터 해제</span>
        </button>
      </div>
      <div class="flex flex-wrap gap-2" role="group" aria-label="기수 필터 버튼">
        <button
          v-for="([gen, count], idx) in generationStats.sorted"
          :key="gen"
          :class="clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            idx === 0 
              ? 'bg-primary/10 text-primary hover:bg-primary/20 ring-1 ring-primary/20' 
              : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
          )"
          @click="searchTerm = String(gen)"
          :aria-label="`${gen}기 팀원 ${count}명 필터`"
          :aria-pressed="searchTerm === String(gen)"
        >
          <span>{{ gen }}기</span>
          <span :class="clsx(
            'px-1.5 py-0.5 rounded text-xs font-bold',
            idx === 0 ? 'bg-primary/15' : 'bg-background'
          )">{{ count }}</span>
        </button>
        <button
          v-if="generationStats.unknown > 0"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          @click="searchTerm = ''"
          aria-label="기수 미지정 팀원 필터"
        >
          <span>기타</span>
          <span class="px-1.5 py-0.5 rounded bg-background text-xs font-bold">{{ generationStats.unknown }}</span>
        </button>
      </div>
    </div>

    <!-- Member Table -->
    <div 
      class="bg-card border border-border rounded-xl overflow-hidden"
      role="region"
      aria-label="팀원 목록"
    >
      <Table>
        <caption class="sr-only">팀원 목록 테이블 - 기수, 이름, 상태, 관리 작업</caption>
        <TableHeader class="bg-muted/50 border-b border-border">
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="border-0 hover:bg-transparent">
            <TableHead 
              v-for="header in headerGroup.headers" 
              :key="header.id" 
              :class="clsx('text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11', header.column.id === 'generation' ? 'text-center' : '')"
              scope="col"
            >
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
              :key="row.original.name"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
              :class="clsx(
                'group hover:bg-muted/30 border-b border-border last:border-0 transition-colors duration-150',
                !row.original.active && 'opacity-60'
              )"
            >
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="py-3">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else>
            <TableCell colspan="4" class="h-52 text-center p-0">
              <div class="h-full flex flex-col items-center justify-center gap-4">
                <!-- 아이콘 with 그라디언트 배경 -->
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                  <Icon 
                    :name="searchTerm ? 'MagnifyingGlassIcon' : 'UserGroupIcon'" 
                    :size="28" 
                    class="text-primary" 
                    aria-hidden="true"
                  />
                </div>
                <!-- 텍스트 -->
                <div class="space-y-1.5 text-center">
                  <p class="text-base font-medium text-foreground">
                    {{ searchTerm ? '검색 결과가 없습니다' : '아직 팀원이 없어요' }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {{ searchTerm ? '다른 검색어로 시도해보세요' : '첫 번째 팀원을 추가해보세요!' }}
                  </p>
                </div>
                <!-- CTA 버튼 (검색 중이 아닐 때만) -->
                <Button 
                  v-if="!searchTerm"
                  variant="default"
                  size="sm"
                  @click="openAddModal"
                  class="mt-2"
                >
                  <Icon name="PlusIcon" :size="14" aria-hidden="true" />
                  <span class="ml-1.5">팀원 추가하기</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
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
        <Icon name="ExclamationTriangleIcon" :size="20" />
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
