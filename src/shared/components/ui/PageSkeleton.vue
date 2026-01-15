<script setup lang="ts">
/**
 * PageSkeleton.vue - 페이지 전체 로딩 스켈레톤
 */
import Skeleton from './Skeleton.vue'
import SkeletonCard from './SkeletonCard.vue'
</script>

<template>
  <div class="space-y-6 animate-pulse" aria-label="페이지 로딩 중">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <Skeleton class="h-8 w-48 mb-2" />
        <Skeleton class="h-4 w-64" />
      </div>
      <Skeleton class="h-10 w-32 rounded-[var(--radius-sm)]" />
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>

    <!-- Table -->
    <div class="border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
      <div class="bg-[var(--color-surface-elevated)] p-4">
        <Skeleton class="h-5 w-32" />
      </div>
      <table class="w-full">
        <tbody>
          <tr v-for="i in 5" :key="i" aria-hidden="true">
            <td v-for="j in 4" :key="j" class="px-4 py-3">
              <Skeleton class="h-5 w-full" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
