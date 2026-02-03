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
    <!-- Header -->
    <header class="sticky top-0 z-50 w-full h-16 bg-background/95 backdrop-blur-lg border-b border-border/50 flex items-center">
      <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <!-- Logo area -->
        <RouterLink 
          to="/" 
          class="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
          aria-label="Position Helper 홈으로 이동"
        >
          <div class="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/25">
            <Icon name="CameraIcon" :size="18" aria-hidden="true" />
          </div>
          <span class="text-lg font-bold tracking-tight text-foreground">
            Position<span class="text-primary">Helper</span>
          </span>
        </RouterLink>

        <!-- Desktop Nav - Segmented Control -->
        <nav 
          class="hidden md:flex items-center bg-muted/80 dark:bg-muted/50 p-1 rounded-xl shadow-inner"
          role="navigation"
          aria-label="메인 네비게이션"
        >
          <RouterLink
            v-for="link in navLinks"
            :key="link.href"
            :to="link.href"
            :aria-current="isActive(link.href) ? 'page' : undefined"
            :class="clsx(
              'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              isActive(link.href)
                ? 'bg-background dark:bg-card text-foreground shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50 dark:hover:bg-card/30'
            )"
          >
            <Icon 
              :name="link.icon" 
              :size="16" 
              :class="clsx(
                'transition-colors duration-200',
                isActive(link.href) ? 'text-primary' : ''
              )" 
              aria-hidden="true"
            />
            <span>{{ link.label }}</span>
          </RouterLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Mobile Nav -->
    <nav 
      class="md:hidden sticky top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50 overflow-x-auto scrollbar-hide"
      role="navigation"
      aria-label="모바일 네비게이션"
    >
      <div class="flex px-4 py-2.5 gap-2">
        <RouterLink
          v-for="link in navLinks"
          :key="link.href"
          :to="link.href"
          :aria-current="isActive(link.href) ? 'page' : undefined"
          :class="clsx(
            'flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            isActive(link.href)
              ? 'bg-background dark:bg-card text-foreground shadow-sm ring-1 ring-border/50'
              : 'text-muted-foreground hover:text-foreground bg-muted/60 dark:bg-muted/40'
          )"
        >
          <Icon 
            :name="link.icon" 
            :size="16" 
            :class="clsx(
              'transition-colors duration-200',
              isActive(link.href) ? 'text-primary' : ''
            )" 
            aria-hidden="true"
          />
          <span>{{ link.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- Main Content -->
    <main 
      class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8"
      role="main"
    >
      <slot />
    </main>
  </div>
</template>
