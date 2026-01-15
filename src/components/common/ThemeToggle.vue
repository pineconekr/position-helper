<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import Icon from '@/components/ui/Icon.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const themeStore = useThemeStore()

function cycleTheme() {
  const themes = ['light', 'dark', 'system'] as const
  const currentIndex = themes.indexOf(themeStore.theme)
  const nextIndex = (currentIndex + 1) % themes.length
  themeStore.setTheme(themes[nextIndex])
}

function getIcon() {
  if (themeStore.theme === 'system') return 'computer'
  return themeStore.theme === 'dark' ? 'dark_mode' : 'light_mode'
}

const themeLabel = computed(() => {
  const labels = {
    light: '라이트 모드',
    dark: '다크 모드',
    system: '시스템 설정'
  }
  return labels[themeStore.theme]
})
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          @click="cycleTheme"
          class="icon-btn"
          aria-label="Toggle theme"
        >
          <Icon :name="getIcon()" :size="18" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>테마: {{ themeLabel }}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
