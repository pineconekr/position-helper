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
  <div class="relative min-h-screen bg-background text-foreground">
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-foreground/[0.035] to-transparent dark:from-white/[0.03] sm:h-[340px]" />
      <div class="absolute -left-20 top-14 h-64 w-64 rounded-full bg-foreground/[0.04] blur-3xl dark:bg-white/[0.04]" />
      <div class="absolute -right-24 top-20 h-72 w-72 rounded-full bg-primary/[0.065] blur-3xl" />
      <div class="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-border-subtle)_62%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-border-subtle)_62%,transparent)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_bottom,black,black_42%,transparent_90%)] opacity-25 dark:opacity-20" />
    </div>

    <!-- Header -->
    <header class="sticky top-0 z-50 w-full border-b border-border/70 bg-[var(--color-surface-glass)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--color-surface-glass)]">
      <div class="mx-auto flex h-14 w-full max-w-[1520px] items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-10">
        <RouterLink
          to="/"
          class="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2"
          aria-label="Position Helper 홈으로 이동"
        >
          <AppLogo />
        </RouterLink>

        <nav
          class="hidden items-center gap-1 rounded-full border border-border/75 bg-background/70 p-1 shadow-sm md:flex"
          role="navigation"
          aria-label="메인 네비게이션"
        >
          <RouterLink
            v-for="link in navLinks"
            :key="link.href"
            :to="link.href"
            :aria-current="isActive(link.href) ? 'page' : undefined"
            :class="clsx(
              'group relative flex min-h-[40px] items-center gap-2 rounded-full px-3.5 py-2 text-[0.9rem] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1',
              isActive(link.href)
                ? 'bg-foreground text-background shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.05)] dark:shadow-[inset_0_0_0_1px_rgb(0_0_0_/_0.24)]'
                : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
            )"
          >
            <Icon
              :name="link.icon"
              :size="16"
              :class="clsx(
                'transition-colors',
                isActive(link.href) ? 'text-background/90' : 'opacity-75 group-hover:opacity-100'
              )"
              aria-hidden="true"
            />
            <span>{{ link.label }}</span>
          </RouterLink>
        </nav>

        <div class="flex items-center gap-2">
          <DbStatusIndicator />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Mobile Nav -->
    <nav
      class="sticky top-14 z-40 overflow-x-auto border-b border-border/70 bg-[var(--color-surface-glass)] backdrop-blur-xl scrollbar-hide md:top-16 md:hidden"
      role="navigation"
      aria-label="모바일 네비게이션"
    >
      <div class="flex gap-1.5 px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
        <RouterLink
          v-for="link in navLinks"
          :key="link.href"
          :to="link.href"
          :aria-current="isActive(link.href) ? 'page' : undefined"
          :class="clsx(
            'flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.82rem] font-medium transition-colors sm:min-h-[42px] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-[0.9rem]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1',
            isActive(link.href)
              ? 'bg-foreground text-background'
              : 'border border-border/70 bg-background/75 text-muted-foreground hover:text-foreground'
          )"
        >
          <Icon
            :name="link.icon"
            :size="16"
            :class="clsx(
              'transition-colors',
              isActive(link.href) ? 'text-background/90' : ''
            )"
            aria-hidden="true"
          />
          <span>{{ link.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <main
      class="mx-auto w-full max-w-[1520px] px-3 pb-7 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-10 lg:pt-8"
      role="main"
    >
      <slot />
    </main>
  </div>
</template>
