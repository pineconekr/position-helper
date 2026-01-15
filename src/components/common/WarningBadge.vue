<script setup lang="ts">
/**
 * WarningBadge.vue - 경고 배지
 */
import { Badge } from '@/components/ui/badge'

interface Props {
  count: number
}

defineProps<Props>()
</script>

<template>
  <Badge v-if="count <= 0" variant="success">경고 없음</Badge>
  <Badge v-else variant="destructive">⚠ {{ count }}건</Badge>
</template>
