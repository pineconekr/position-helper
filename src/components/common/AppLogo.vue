<script setup lang="ts">
/**
 * AppLogo.vue
 * 
 * Notion/Linear/Vercel 스타일의 기하학적 미니멀리즘 로고.
 * '위치(Position)'와 '정렬(Alignment)'을 상징하는 4분면 심볼 사용.
 */
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <div class="flex items-center gap-2.5 select-none">
    <!-- Symbol -->
    <div class="relative w-8 h-8 flex items-center justify-center">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 배경/그림자 효과 -->
        <rect width="32" height="32" rx="8" class="fill-primary/10 dark:fill-white/5" />
        
        <!-- 로고 심볼: 4분면 중 특정 위치 강조 -->
        <g class="transform translate-x-[7px] translate-y-[7px]">
          <!-- 왼쪽 위: 기본 -->
          <rect x="0" y="0" width="8" height="8" rx="2" class="fill-foreground/40" />
          <!-- 왼쪽 아래: 기본 -->
          <rect x="0" y="10" width="8" height="8" rx="2" class="fill-foreground/40" />
          <!-- 오른쪽 아래: 기본 -->
          <rect x="10" y="10" width="8" height="8" rx="2" class="fill-foreground/40" />
          
          <!-- 오른쪽 위: 강조 (Position) -->
          <rect x="10" y="0" width="8" height="8" rx="2" class="fill-primary animate-subtle-pulse" />
          
          <!-- Shine Effect (Linear Style) -->
          <rect x="10" y="0" width="8" height="8" rx="2" fill="url(#shine-gradient)" style="mix-blend-mode: overlay; opacity: 0.5;" />
        </g>
        
        <!-- 그라데이션 정의 -->
        <defs>
          <linearGradient id="shine-gradient" x1="0" y1="0" x2="8" y2="8" gradientUnits="userSpaceOnUse">
            <stop stop-color="white" stop-opacity="0.8"/>
            <stop offset="1" stop-color="white" stop-opacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    </div>

    <!-- Logotype -->
    <div v-if="!collapsed" class="flex flex-col justify-center h-8">
      <span class="text-[15px] font-bold tracking-tight text-foreground leading-none">
        Position Helper
      </span>
      <span class="text-[10px] font-medium text-muted-foreground tracking-wide mt-0.5">
        WORKSPACE
      </span>
    </div>
  </div>
</template>

<style scoped>
.animate-subtle-pulse {
  animation: pulse-opacity 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
</style>
