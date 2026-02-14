<script setup lang="ts">
import {
  FlexRender,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useVueTable,
} from '@tanstack/vue-table'
import { computed, h, ref } from 'vue'
import type { MembersEntry } from '@/shared/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Icon from '@/components/ui/Icon.vue'

export interface MemberWithStats extends MembersEntry {
  assignmentCount: number
  absenceCount: number
}

const props = defineProps<{
  members: MemberWithStats[]
}>()

const emit = defineEmits<{
  (e: 'update:active', name: string, active: boolean): void
  (e: 'bulk:active', names: string[], active: boolean): void
  (e: 'edit', member: MembersEntry): void
}>()

const sorting = ref<SortingState>([{ id: 'active', desc: true }])
const rowSelection = ref({})
const columnHelper = createColumnHelper<MemberWithStats>()

function renderSortHeader(label: string, ariaLabel: string, hiddenClass = '') {
  return ({ column }: { column: any }) => {
    const sorted = column.getIsSorted()
    const sortIcon = h(Icon, {
      name: sorted === 'asc' ? 'ChevronUpIcon' : (sorted === 'desc' ? 'ChevronDownIcon' : 'ArrowsUpDownIcon'),
      size: 14,
      class: sorted ? 'text-primary' : 'text-muted-foreground/55',
    })
    return h(
      Button,
      {
        variant: 'ghost',
        class: `-ml-1 inline-flex h-8 items-center gap-1 rounded-sm px-1 text-sm font-semibold text-foreground hover:bg-transparent ${hiddenClass}`.trim(),
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        'aria-label': ariaLabel,
      },
      () => [
        label,
        h('span', { class: 'inline-flex w-4 items-center justify-center' }, [sortIcon]),
      ],
    )
  }
}

const columns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) =>
      h('div', { class: 'flex items-center justify-center' }, [
        h(Checkbox, {
          checked: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:checked': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
          'aria-label': '전체 선택',
        }),
      ]),
    cell: ({ row }) =>
      h('div', { class: 'flex items-center justify-center' }, [
        h(Checkbox, {
          checked: row.getIsSelected(),
          'onUpdate:checked': (value: boolean) => row.toggleSelected(!!value),
          'aria-label': `${row.original.name} 선택`,
        }),
      ]),
    enableSorting: false,
  }),
  columnHelper.accessor('name', {
    header: renderSortHeader('이름', '이름 정렬'),
    cell: ({ row }) =>
      h('div', { class: 'flex min-w-0 items-center gap-2' }, [
        h('span', { class: 'truncate text-base font-semibold tracking-tight text-foreground' }, row.original.name),
        !row.original.active
          ? h(Badge, { variant: 'outline', class: 'h-5 border-border/70 text-[10px] font-medium text-muted-foreground' }, () => '비활동')
          : null,
      ]),
  }),
  columnHelper.accessor('generation', {
    header: renderSortHeader('기수', '기수 정렬', 'hidden sm:inline-flex'),
    cell: ({ row }) =>
      h(
        'div',
        { class: 'hidden sm:block text-base font-medium text-foreground/85' },
        row.original.generation > 0 ? `${row.original.generation}기` : '-',
      ),
  }),
  columnHelper.accessor('active', {
    header: renderSortHeader('상태', '상태 정렬'),
    cell: ({ row }) => {
      const isActive = row.original.active
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', {
          class: 'h-2 w-2 rounded-full',
          style: { backgroundColor: isActive ? 'var(--color-success)' : 'var(--color-label-quaternary)' },
        }),
        h(
          'span',
          {
            class: 'text-base font-medium',
            style: { color: isActive ? 'var(--color-success)' : 'var(--color-label-tertiary)' },
          },
          isActive ? '활동' : '비활동',
        ),
      ])
    },
  }),
  columnHelper.accessor('assignmentCount', {
    header: renderSortHeader('배정', '배정 횟수 정렬'),
    cell: ({ row }) =>
      h('span', { class: 'text-base font-semibold tabular-nums text-foreground' }, String(row.original.assignmentCount)),
  }),
  columnHelper.accessor('absenceCount', {
    header: renderSortHeader('불참', '불참 횟수 정렬'),
    cell: ({ row }) => {
      const value = row.original.absenceCount
      return h(
        'span',
        {
          class: 'text-base font-semibold tabular-nums',
          style: { color: value > 0 ? 'var(--color-warning)' : 'var(--color-label-primary)' },
        },
        String(value),
      )
    },
  }),
  columnHelper.accessor('notes', {
    header: () => h('span', { class: 'text-sm font-semibold text-muted-foreground' }, '메모'),
    cell: ({ row }) =>
      h(
        'span',
        {
          class: 'block max-w-[260px] truncate text-sm text-muted-foreground',
          title: row.original.notes || '',
        },
        row.original.notes || '-',
      ),
    enableSorting: false,
  }),
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => {
      const member = row.original
      return h(DropdownMenu, {}, {
        default: () => [
          h(DropdownMenuTrigger, { asChild: true }, {
            default: () =>
              h(Button, {
                variant: 'ghost',
                size: 'icon',
                class: 'h-8 w-8',
                'aria-label': `${member.name} 작업 메뉴`,
              }, {
                default: () => h(Icon, { name: 'EllipsisHorizontalIcon', size: 16 }),
              }),
          }),
          h(DropdownMenuContent, { align: 'end', class: 'w-[150px]' }, {
            default: () => [
              h(DropdownMenuItem, { onClick: () => emit('edit', member) }, {
                default: () => [h(Icon, { name: 'PencilIcon', size: 14, class: 'mr-2' }), '정보 수정'],
              }),
              h(DropdownMenuItem, { onClick: () => emit('update:active', member.name, !member.active) }, {
                default: () => [
                  h(Icon, { name: member.active ? 'PauseIcon' : 'PlayIcon', size: 14, class: 'mr-2' }),
                  member.active ? '비활성화' : '활성화',
                ],
              }),
            ],
          }),
        ],
      })
    },
  }),
]

const table = useVueTable({
  get data() {
    return props.members
  },
  getRowId: (row) => row.name,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  state: {
    get sorting() {
      return sorting.value
    },
    get rowSelection() {
      return rowSelection.value
    },
  },
  onSortingChange: (updaterOrValue) => {
    sorting.value = typeof updaterOrValue === 'function' ? updaterOrValue(sorting.value) : updaterOrValue
  },
  onRowSelectionChange: (updaterOrValue) => {
    rowSelection.value = typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection.value) : updaterOrValue
  },
  enableRowSelection: true,
})

const selectedRows = computed(() => table.getSelectedRowModel().rows)
const selectedCount = computed(() => selectedRows.value.length)

function handleBulkAction(active: boolean) {
  const names = selectedRows.value.map((row) => row.original.name)
  if (names.length === 0) return
  emit('bulk:active', names, active)
  table.resetRowSelection()
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="selectedCount > 0"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
    >
      <p class="text-base font-semibold text-foreground">
        {{ selectedCount }}명 선택됨
      </p>
      <div class="flex items-center gap-1.5">
        <Button size="sm" variant="outline" class="h-8 text-xs" @click="handleBulkAction(true)">활동 처리</Button>
        <Button size="sm" variant="outline" class="h-8 text-xs" @click="handleBulkAction(false)">비활동 처리</Button>
        <Button size="sm" variant="ghost" class="h-8 text-xs" @click="table.resetRowSelection()">선택 해제</Button>
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border border-border/70 bg-card">
      <Table class="table-fixed">
        <TableHeader class="bg-muted/20">
          <TableRow
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="border-b border-border/60"
          >
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :class="[
                header.column.id === 'select' && 'w-10 px-0 text-center',
                header.column.id === 'name' && 'w-[20%] px-3 py-3',
                header.column.id === 'generation' && 'w-[10%] px-3 py-3',
                header.column.id === 'active' && 'w-[12%] px-3 py-3',
                header.column.id === 'assignmentCount' && 'w-[10%] px-3 py-3',
                header.column.id === 'absenceCount' && 'w-[10%] px-3 py-3',
                header.column.id === 'notes' && 'w-[28%] px-3 py-3',
                header.column.id === 'actions' && 'w-[10%] px-3 py-3',
              ]"
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
          <TableRow v-if="table.getRowModel().rows.length === 0">
            <TableCell :colspan="columns.length" class="h-24 text-center text-base text-muted-foreground">
              조건에 맞는 멤버가 없습니다.
            </TableCell>
          </TableRow>

          <TableRow
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            :data-state="row.getIsSelected() ? 'selected' : undefined"
            class="min-h-[52px] border-b border-border/40 last:border-0 hover:bg-muted/20 data-[state=selected]:bg-primary/5"
          >
            <TableCell
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              :class="[
                cell.column.id === 'select' && 'px-0 text-center',
                cell.column.id !== 'select' && 'px-3 py-3 align-middle',
              ]"
            >
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
