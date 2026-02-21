<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        'bg-card/95 text-card-foreground flex flex-col gap-6 rounded-[calc(var(--radius)+0.15rem)] border border-border/80 py-6 backdrop-blur-[2px]',
        props.class,
      )
    "
    style="box-shadow: var(--shadow-card)"
  >
    <slot />
  </div>
</template>
