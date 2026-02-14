<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import type { MembersEntry } from '@/shared/types'

const props = defineProps<{
  open: boolean
  member?: MembersEntry | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', member: MembersEntry): void
}>()

const form = ref<{
  name: string
  generation: number | undefined
  notes: string
  active: boolean
}>({
  name: '',
  generation: undefined,
  notes: '',
  active: true,
})

const isEditing = ref(false)
const fieldErrors = ref<{ name?: string; generation?: string }>({})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    fieldErrors.value = {}
    if (props.member) {
      form.value = {
        name: props.member.name,
        generation: props.member.generation,
        notes: props.member.notes ?? '',
        active: props.member.active,
      }
      isEditing.value = true
      return
    }

    form.value = {
      name: '',
      generation: undefined,
      notes: '',
      active: true,
    }
    isEditing.value = false
  },
)

const trimmedName = computed(() => form.value.name.trim())
const normalizedGeneration = computed(() => {
  const value = form.value.generation
  if (value === undefined || value === null || Number.isNaN(value)) return undefined
  return Math.trunc(Number(value))
})

function validateForm(): boolean {
  const errors: { name?: string; generation?: string } = {}

  if (!trimmedName.value) {
    errors.name = '이름은 필수입니다.'
  } else if (trimmedName.value.length < 2) {
    errors.name = '이름은 2자 이상 입력하세요.'
  }

  if (normalizedGeneration.value === undefined) {
    errors.generation = '기수를 입력하세요.'
  } else if (normalizedGeneration.value < 1 || normalizedGeneration.value > 99) {
    errors.generation = '기수는 1~99 사이여야 합니다.'
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

const isSaveDisabled = computed(() => !trimmedName.value || normalizedGeneration.value === undefined)

function handleSave() {
  if (!validateForm()) return

  emit('save', {
    name: trimmedName.value,
    generation: normalizedGeneration.value as number,
    active: form.value.active,
    notes: form.value.notes.trim() || undefined,
  })
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? '멤버 정보 수정' : '새 멤버 추가' }}</DialogTitle>
        <DialogDescription>
          이름, 기수, 상태, 메모를 입력해 멤버 프로필을 관리합니다.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-1.5">
          <Label for="member-name">이름</Label>
          <Input
            id="member-name"
            v-model="form.name"
            placeholder="예: 홍길동"
            autofocus
          />
          <p v-if="fieldErrors.name" class="text-xs text-destructive">{{ fieldErrors.name }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="member-generation">기수</Label>
          <Input
            id="member-generation"
            type="number"
            v-model.number="form.generation"
            min="1"
            max="99"
            placeholder="예: 20"
          />
          <p v-if="fieldErrors.generation" class="text-xs text-destructive">{{ fieldErrors.generation }}</p>
        </div>

        <div class="space-y-1.5">
          <Label for="member-notes">메모</Label>
          <Textarea
            id="member-notes"
            v-model="form.notes"
            placeholder="예: SW 가능, 특정 요일 불가"
            class="min-h-24"
          />
        </div>

        <div class="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
          <Checkbox
            id="member-active"
            :checked="form.active"
            @update:checked="(value: boolean) => form.active = value"
          />
          <Label for="member-active" class="cursor-pointer text-sm">
            활동 멤버로 관리
          </Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">취소</Button>
        <Button :disabled="isSaveDisabled" @click="handleSave">
          {{ isEditing ? '저장' : '추가' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
