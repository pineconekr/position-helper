<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import Icon from '@/components/ui/Icon.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const themeStore = useThemeStore()

const themes = ['light', 'dark', 'system'] as const

function cycleTheme() {
  const currentIndex = themes.indexOf(themeStore.theme)
  const nextIndex = (currentIndex + 1) % themes.length
  themeStore.setTheme(themes[nextIndex])
}

const currentIcon = computed(() => {
  if (themeStore.theme === 'system') return 'ComputerDesktopIcon'
  return themeStore.theme === 'dark' ? 'MoonIcon' : 'SunIcon'
})

const themeLabel = computed(() => {
  const labels = {
    light: '라이트 모드',
    dark: '다크 모드',
    system: '시스템 설정'
  }
  return labels[themeStore.theme]
})

const nextThemeLabel = computed(() => {
  const currentIndex = themes.indexOf(themeStore.theme)
  const nextIndex = (currentIndex + 1) % themes.length
  const labels = {
    light: '라이트 모드로 변경',
    dark: '다크 모드로 변경',
    system: '시스템 설정으로 변경'
  }
  return labels[themes[nextIndex]]
})
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          @click="cycleTheme"
          class="
            p-2 rounded-lg transition-all duration-200
            text-muted-foreground hover:text-foreground
            hover:bg-muted/80 dark:hover:bg-muted/50
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
          "
          :aria-label="nextThemeLabel"
          role="button"
        >
          <Icon :name="currentIcon" :size="18" aria-hidden="true" />
          <span class="sr-only">현재 테마: {{ themeLabel }}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" :sideOffset="8">
        <p class="text-sm font-medium">{{ themeLabel }}</p>
        <p class="text-xs text-muted-foreground">클릭하여 변경</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
