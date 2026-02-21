<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <div class="flex select-none items-center gap-3">
    <div class="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-border/80 bg-[linear-gradient(150deg,color-mix(in_srgb,var(--color-surface)_78%,white_22%),color-mix(in_srgb,var(--color-canvas-elevated)_86%,transparent))] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.66),0_10px_20px_rgb(15_23_42_/_0.12)] dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.1),0_10px_20px_rgb(0_0_0_/_0.42)]">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="3" width="16" height="16" rx="4.5" stroke="var(--color-label-primary)" stroke-opacity="0.85" stroke-width="1.45" />
        <path d="M7.2 14.8V7.2H11.4C12.95 7.2 14.05 8.15 14.05 9.55C14.05 10.98 12.95 11.9 11.4 11.9H9.25" stroke="var(--color-label-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M9.25 11.9L14.8 16.2" stroke="var(--color-accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="15.4" cy="15.55" r="1.35" fill="var(--color-accent)" />
      </svg>
      <span class="pointer-events-none absolute -right-2 -top-2 h-5 w-5 rounded-full bg-primary/25 blur-md" />
    </div>

    <div v-if="!collapsed" class="flex h-9 flex-col justify-center leading-none">
      <span class="text-[0.94rem] font-semibold tracking-[-0.018em] text-foreground sm:text-[0.98rem]">Position Helper</span>
      <span class="mt-1 hidden text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline">Control Plane</span>
    </div>
  </div>
</template>

