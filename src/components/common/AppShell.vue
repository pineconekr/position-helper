<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import clsx from 'clsx'
import Icon from '@/components/ui/Icon.vue'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()

const navLinks = [
  { href: '/', label: '배정', icon: 'ClipboardDocumentCheckIcon' },
  { href: '/stats', label: '통계', icon: 'ChartBarIcon' },
  { href: '/members', label: '팀원', icon: 'UserGroupIcon' },
  { href: '/settings', label: '설정', icon: 'Cog6ToothIcon' },
]

function isActive(href: string): boolean {
  return href === '/' ? route.path === '/' : route.path.startsWith(href)
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header - Stitch Style (h-16) -->
    <header class="sticky top-0 z-50 w-full h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center">
      <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <!-- Logo area - Stitch Style -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Icon name="CameraIcon" :size="18" aria-hidden="true" />
          </div>
          <span class="text-lg font-bold tracking-tight text-foreground">
            Position<span class="text-primary">Helper</span>
          </span>
        </div>

        <!-- Nav - Stitch Pill Style -->
        <nav class="hidden md:flex items-center gap-1 bg-muted p-1 rounded-full">
          <RouterLink
            v-for="link in navLinks"
            :key="link.href"
            :to="link.href"
            :aria-current="isActive(link.href) ? 'page' : undefined"
            :class="clsx(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              isActive(link.href)
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )"
          >
            <Icon 
              :name="link.icon" 
              :size="16" 
              :class="isActive(link.href) ? 'text-primary' : ''" 
              aria-hidden="true"
            />
            {{ link.label }}
          </RouterLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Mobile Nav - Stitch Style (separate row) -->
    <nav class="md:hidden sticky top-16 z-40 bg-background border-b border-border overflow-x-auto scrollbar-hide">
      <div class="flex px-4 py-2 gap-2">
        <RouterLink
          v-for="link in navLinks"
          :key="link.href"
          :to="link.href"
          :aria-current="isActive(link.href) ? 'page' : undefined"
          :class="clsx(
            'flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium min-h-[44px] transition-colors duration-150',
            isActive(link.href)
              ? 'bg-card text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground bg-muted'
          )"
        >
          <Icon 
            :name="link.icon" 
            :size="16" 
            :class="isActive(link.href) ? 'text-primary' : ''" 
            aria-hidden="true"
          />
          {{ link.label }}
        </RouterLink>
      </div>
    </nav>

    <!-- Main Content - Stitch Style -->
    <main class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <slot />
    </main>
  </div>
</template>
