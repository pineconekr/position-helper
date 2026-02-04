<script setup lang="ts">
import { ref, watch } from 'vue'
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
  member?: MembersEntry | null // null means new member
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', member: MembersEntry): void
}>()

// Form state with normalized structure (generation is required number)
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

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.member) {
      form.value = {
        name: props.member.name,
        generation: props.member.generation,
        notes: props.member.notes ?? '',
        active: props.member.active,
      }
      isEditing.value = true
    } else {
      form.value = {
        name: '',
        generation: undefined,
        notes: '',
        active: true,
      }
      isEditing.value = false
    }
  }
})

const handleSave = () => {
  if (!form.value.name.trim()) return // Simple validation
  
  const member: MembersEntry = {
    name: form.value.name.trim(),
    generation: form.value.generation ?? 0, // Default to 0 if not set
    active: form.value.active,
    notes: form.value.notes || undefined,
  }
  
  emit('save', member)
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? '멤버 수정' : '새 멤버 추가' }}</DialogTitle>
        <DialogDescription>
          {{ isEditing ? '멤버 정보를 수정합니다.' : '새로운 멤버를 목록에 추가합니다.' }}
        </DialogDescription>
      </DialogHeader>
      
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="name" class="text-right">이름</Label>
          <Input id="name" v-model="form.name" class="col-span-3" placeholder="홍길동" autofocus />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="generation" class="text-right">기수</Label>
          <Input 
            id="generation" 
            type="number" 
            v-model.number="form.generation" 
            class="col-span-3" 
            placeholder="20" 
          />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="active" class="text-right">활동 상태</Label>
          <div class="flex items-center space-x-2 col-span-3">
            <Checkbox id="active" :checked="form.active" @update:checked="(v: boolean) => form.active = v" />
            <span class="text-sm text-muted-foreground">활성 멤버</span>
          </div>
        </div>
        <div class="grid grid-cols-4 items-start gap-4">
          <Label for="notes" class="text-right mt-2">메모</Label>
          <Textarea id="notes" v-model="form.notes" class="col-span-3" placeholder="특이사항..." />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">취소</Button>
        <Button @click="handleSave">{{ isEditing ? '저장' : '추가' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
