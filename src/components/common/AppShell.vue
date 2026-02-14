<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import clsx from 'clsx'
import Icon from '@/components/ui/Icon.vue'
import AppLogo from './AppLogo.vue'
import ThemeToggle from './ThemeToggle.vue'
import DbStatusIndicator from './DbStatusIndicator.vue'

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
  <div class="min-h-screen bg-background text-foreground">
    <!-- Header -->
    <header class="sticky top-0 z-50 h-16 w-full border-b border-border/80 bg-background/92 backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <!-- Logo area -->
        <RouterLink 
          to="/" 
          class="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2"
          aria-label="Position Helper 홈으로 이동"
        >
          <AppLogo />
        </RouterLink>

        <!-- Desktop Nav - Transparent Tabs -->
        <nav 
          class="hidden md:flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 px-1.5 py-1"
          role="navigation"
          aria-label="메인 네비게이션"
        >
          <RouterLink
            v-for="link in navLinks"
            :key="link.href"
            :to="link.href"
            :aria-current="isActive(link.href) ? 'page' : undefined"
            :class="clsx(
              'group relative flex min-h-[40px] items-center gap-2 rounded-md px-3 py-2 text-[0.95rem] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1',
              isActive(link.href)
                ? 'bg-primary/12 text-foreground'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )"
          >
            <Icon 
              :name="link.icon" 
              :size="16" 
              :class="clsx(
                'transition-colors',
                isActive(link.href) ? 'text-primary' : 'opacity-75 group-hover:opacity-100'
              )" 
              aria-hidden="true"
            />
            <span>{{ link.label }}</span>
          </RouterLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <DbStatusIndicator />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Mobile Nav -->
    <nav 
      class="sticky top-16 z-40 overflow-x-auto border-b border-border/80 bg-background/92 backdrop-blur-xl scrollbar-hide md:hidden"
      role="navigation"
      aria-label="모바일 네비게이션"
    >
      <div class="flex gap-2 px-4 py-2.5">
        <RouterLink
          v-for="link in navLinks"
          :key="link.href"
          :to="link.href"
          :aria-current="isActive(link.href) ? 'page' : undefined"
          :class="clsx(
            'flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-[0.95rem] font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1',
            isActive(link.href)
              ? 'bg-primary/14 text-foreground'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )"
        >
          <Icon 
            :name="link.icon" 
            :size="16" 
            :class="clsx(
                'transition-colors',
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
      class="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8"
      role="main"
    >
      <slot />
    </main>
  </div>
</template>
