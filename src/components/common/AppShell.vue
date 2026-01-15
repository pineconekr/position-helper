<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import clsx from 'clsx'
import Icon from '@/components/ui/Icon.vue'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()

const navLinks = [
  { href: '/', label: '배정', icon: 'assignment' },
  { href: '/stats', label: '통계', icon: 'bar_chart' },
  { href: '/members', label: '팀원', icon: 'group' },
  { href: '/settings', label: '설정', icon: 'settings' },
]

function isActive(href: string): boolean {
  return href === '/' ? route.path === '/' : route.path.startsWith(href)
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Header - Compact (h-12) & Glassmorphism -->
    <header :class="clsx(
      'sticky top-0 z-50 w-full h-12',
      'bg-[var(--color-surface)]/80 backdrop-blur-md',
      'border-b border-[var(--color-border-subtle)]',
      'flex items-center'
    )">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <!-- Logo area -->
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
            <Icon name="photo_camera" :size="14" />
          </div>
          <span class="text-[13px] font-semibold tracking-tight">
            Position Helper
          </span>
        </div>

        <!-- Nav - Minimal Tabs -->
        <nav class="hidden md:flex items-center gap-1">
          <RouterLink
            v-for="link in navLinks"
            :key="link.href"
            :to="link.href"
            :class="clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)]',
              'text-[13px] font-medium transition-all duration-200',
              isActive(link.href)
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-label-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-[var(--color-label-secondary)] hover:bg-[var(--color-surface-elevated)]/50 hover:text-[var(--color-label-primary)]'
            )"
          >
            <Icon 
              :name="link.icon" 
              :size="15" 
              :class="isActive(link.href) ? 'text-[var(--color-accent)]' : 'opacity-70'" 
            />
            {{ link.label }}
          </RouterLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      <!-- Mobile Nav -->
      <nav class="md:hidden absolute top-12 left-0 w-full bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)] overflow-x-auto scrollbar-hide">
        <div class="flex px-4 h-12 items-center gap-1">
          <RouterLink
            v-for="link in navLinks"
            :key="link.href"
            :to="link.href"
            :class="clsx(
              'flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium',
              'min-h-[44px]',
              'transition-colors duration-150',
              isActive(link.href)
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-label-primary)] shadow-sm ring-1 ring-black/5'
                : 'text-[var(--color-label-secondary)] hover:text-[var(--color-label-primary)]'
            )"
          >
            <Icon 
              :name="link.icon" 
              :size="16" 
              :class="isActive(link.href) ? 'text-[var(--color-accent)]' : 'opacity-60'" 
            />
            {{ link.label }}
          </RouterLink>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <!-- mt-12 md:mt-0: 모바일에서 mobile nav 높이만큼 마진 추가 -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 mt-12 md:mt-0">
      <slot />
    </main>
  </div>
</template>
