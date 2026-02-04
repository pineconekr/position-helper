<script setup lang="ts">
import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  createColumnHelper,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/vue-table'
import { ref, h } from 'vue' // Helper for render functions
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
import type { MembersEntry } from '@/shared/types'

// Extended Type
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

// --- TanStack Table Setup ---
const columnHelper = createColumnHelper<MemberWithStats>()

const columns = [
  // 1. Checkbox
  columnHelper.display({
    id: 'select',
    header: ({ table }) => {
        return h('div', { class: 'flex items-center justify-center pl-1' }, [
             h(Checkbox, {
                checked: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
                'onUpdate:checked': (value: boolean) => table.toggleAllPageRowsSelected(!!value), // Standard boolean handling
                ariaLabel: '전체 선택',
                class: 'translate-y-[1px]'
             })
        ])
    },
    cell: ({ row }) => {
        return h('div', { class: 'flex items-center justify-center pl-1' }, [
            h(Checkbox, {
                checked: row.getIsSelected(),
                'onUpdate:checked': (value: boolean) => row.toggleSelected(!!value),
                ariaLabel: `${row.original.name} 선택`,
                class: 'translate-y-[1px]'
            })
        ])
    },
    enableSorting: false,
  }),
  // 2. A-Z Active Status (Sortable)
  columnHelper.accessor('active', {
    header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return h(Button, {
            variant: 'ghost',
            class: 'p-0 hover:bg-transparent text-xs font-semibold group flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-1 -ml-1',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
            ariaLabel: '상태 정렬'
        }, () => [
            '상태', 
            h(Icon, { 
                name: isSorted === 'asc' ? 'ChevronUpIcon' : (isSorted === 'desc' ? 'ChevronDownIcon' : 'ArrowsUpDownIcon'), 
                size: 13, 
                class: isSorted ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground transition-colors' 
            })
        ])
    },
    cell: ({ getValue }) => {
        const isActive = getValue()
        return h('div', { class: 'flex items-center gap-2' }, [
            h('span', { class: `w-2 h-2 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_8px_-1px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground/30'}` }),
            h('span', { class: `text-xs ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}` }, isActive ? '활동중' : '비활성')
        ])
    }
  }),
  // 3. Name
  columnHelper.accessor('name', {
    header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return h(Button, {
            variant: 'ghost',
            class: 'p-0 hover:bg-transparent text-xs font-semibold group flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-1 -ml-1',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
            ariaLabel: '이름 정렬'
        }, () => [
            '이름', 
            h(Icon, { 
                name: isSorted === 'asc' ? 'ChevronUpIcon' : (isSorted === 'desc' ? 'ChevronDownIcon' : 'ArrowsUpDownIcon'), 
                size: 13, 
                class: isSorted ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground transition-colors' 
            })
        ])
    },
    cell: ({ getValue }) => h('span', { class: 'font-medium text-sm' }, getValue())
  }),
  // 4. Cohort
  columnHelper.accessor('generation', {
    header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return h(Button, {
            variant: 'ghost',
            class: 'p-0 hover:bg-transparent text-xs font-semibold hidden sm:flex group items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-1 -ml-1',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
            ariaLabel: '기수 정렬'
        }, () => [
            '기수', 
            h(Icon, { 
                name: isSorted === 'asc' ? 'ChevronUpIcon' : (isSorted === 'desc' ? 'ChevronDownIcon' : 'ArrowsUpDownIcon'), 
                size: 13, 
                class: isSorted ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground transition-colors' 
            })
        ])
    },
    cell: ({ row }) => {
        const gen = row.original.generation
        return h('div', { class: 'hidden sm:flex items-center gap-1.5' }, [
            gen ? h(Badge, { variant: 'outline', class: 'font-normal text-[10px] h-4 px-1.5 border-border bg-muted/40 text-muted-foreground' }, () => `${gen}기`) : null
        ])
    }
  }),
  // 5. Stats
  columnHelper.accessor('assignmentCount', {
    header: ({ column }) => {
        const isSorted = column.getIsSorted()
        return h(Button, {
            variant: 'ghost',
            class: 'p-0 hover:bg-transparent text-xs font-semibold group flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-1 -ml-1',
            onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
            ariaLabel: '참여도 정렬'
        }, () => [
            '참여도', 
            h(Icon, { 
                name: isSorted === 'asc' ? 'ChevronUpIcon' : (isSorted === 'desc' ? 'ChevronDownIcon' : 'ArrowsUpDownIcon'), 
                size: 13, 
                class: isSorted ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground transition-colors' 
            })
        ])
    },
    cell: ({ getValue }) => {
        const val = getValue()
        const max = Math.max(1, ...props.members.map(m => m.assignmentCount))
        const width = Math.min(100, (val / max) * 100)
        
        return h('div', { class: 'flex items-center gap-2.5' }, [
            h('div', { class: 'h-1.5 w-16 bg-secondary/80 rounded-full overflow-hidden' }, [
                h('div', { class: 'h-full bg-primary/80', style: { width: `${width}%` } })
            ]),
            h('span', { class: 'text-[11px] text-muted-foreground tabular-nums font-mono' }, val)
        ])
    }
  }),
  // 6. Notes (Memo)
  columnHelper.accessor('notes', {
    header: () => h('span', { class: 'text-xs font-semibold pl-1' }, '메모'),
    cell: ({ getValue }) => h('span', { class: 'truncate block text-xs text-muted-foreground max-w-[200px] pl-1', title: getValue() || '' }, getValue()),
    enableSorting: false
  }),
  // 7. Actions
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => {
      const member = row.original
      return h(DropdownMenu, {}, { // DropdownMenu Root
         default: () => [
            h(DropdownMenuTrigger, { asChild: true }, {
               default: () => h(Button, { 
                   variant: 'ghost', 
                   size: 'icon', 
                   class: 'h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all data-[state=open]:opacity-100 data-[state=open]:bg-muted',
                   ariaLabel: '추가 메뉴 열기'
               }, {
                   default: () => h(Icon, { name: 'EllipsisHorizontalIcon', size: 16, class: 'text-muted-foreground' })
               })
            }),
            h(DropdownMenuContent, { align: 'end', class: 'w-[140px]' }, {
               default: () => [
                  h(DropdownMenuItem, { onClick: () => emit('edit', member) }, { 
                      default: () => [h(Icon, { name: 'PencilIcon', size: 14, class: 'mr-2 text-muted-foreground' }), '정보 수정'] 
                  }),
                  h(DropdownMenuItem, { onClick: () => emit('update:active', member.name, !member.active) }, {
                      default: () => [
                        h(Icon, { name: member.active ? 'PauseIcon' : 'PlayIcon', size: 14, class: 'mr-2 text-muted-foreground' }), 
                        member.active ? '비활성화' : '활성화'
                      ]
                  })
               ]
            })
         ]
      })
    }
  })
]

const sorting = ref<SortingState>([{ id: 'active', desc: true }])
const rowSelection = ref({})

const table = useVueTable({
  get data() { return props.members },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  state: {
    get sorting() { return sorting.value },
    get rowSelection() { return rowSelection.value },
  },
  onSortingChange: (updaterOrValue) => {
     sorting.value = typeof updaterOrValue === 'function' ? updaterOrValue(sorting.value) : updaterOrValue
  },
  onRowSelectionChange: (updaterOrValue) => {
     rowSelection.value = typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection.value) : updaterOrValue
  },
  enableRowSelection: true,
})

// Bulk Action Handler
const handleBulkAction = (action: 'active' | 'inactive') => {
    const selectedRows = table.getSelectedRowModel().rows
    const names = selectedRows.map(r => r.original.name)
    if (names.length === 0) return
    
    emit('bulk:active', names, action === 'active')
    table.resetRowSelection()
}

</script>

<template>
  <div class="relative w-full">
      <!-- Bulk Action Bar -->
      <div 
        v-if="Object.keys(rowSelection).length > 0" 
        class="absolute top-0 left-0 right-0 z-10 bg-primary shadow-sm text-primary-foreground flex items-center justify-between px-3 h-10 animate-in fade-in slide-in-from-top-1 duration-200 rounded-t-lg"
      >
         <div class="flex items-center gap-3 text-sm font-medium">
            <span class="bg-primary-foreground/20 px-1.5 py-0.5 rounded-[4px] text-xs font-semibold tabular-nums select-none flex items-center gap-1">
               <Icon name="CheckIcon" :size="12" />
               {{ Object.keys(rowSelection).length }}
            </span>
            <div class="h-4 w-px bg-primary-foreground/20"></div>
            <button class="hover:bg-primary-foreground/10 px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5" @click="handleBulkAction('active')">
                <Icon name="PlayIcon" :size="12" />
                활성화
            </button>
            <button class="hover:bg-red-500/20 px-2 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 text-red-100 hover:text-red-50 hover:bg-red-900/30" @click="handleBulkAction('inactive')">
                <Icon name="PauseIcon" :size="12" />
                비활성화
            </button>
         </div>
         <button @click="table.resetRowSelection()" class="p-1.5 hover:bg-primary-foreground/10 rounded-sm transition-colors" aria-label="선택 해제">
            <Icon name="XMarkIcon" :size="14" />
         </button>
      </div>

      <div class="rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader class="bg-muted/30">
              <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="h-9 hover:bg-muted/30 border-b border-border/60">
                <TableHead v-for="header in headerGroup.headers" :key="header.id" :class="[header.index === 0 ? 'w-[40px] px-0 text-center' : 'h-9 px-4']">
                  <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="table.getRowModel().rows.length === 0">
                <TableCell :colspan="columns.length" class="h-32 text-center text-muted-foreground text-sm">
                   등록된 멤버가 없습니다.
                </TableCell>
              </TableRow>
              <TableRow 
                  v-for="row in table.getRowModel().rows" 
                  :key="row.id" 
                  :data-state="row.getIsSelected() ? 'selected' : undefined"
                  class="group h-11 border-b border-border/40 last:border-0 hover:bg-muted/40 data-[state=selected]:bg-muted/60 transition-colors"
               >
                <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" :class="[cell.column.id === 'select' ? 'px-0 text-center' : 'px-4 py-1']">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
      </div>
  </div>
</template>
