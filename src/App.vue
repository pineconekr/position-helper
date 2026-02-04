<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppShell from './components/common/AppShell.vue'
import { Toaster } from '@/components/ui/sonner'
import DbSyncProvider from './components/providers/DbSyncProvider.vue'
import ModalProvider from '@/shared/components/ModalProvider.vue'
import { useThemeStore } from './stores/theme'
import { onMounted, watch } from 'vue'

const themeStore = useThemeStore()

// Theme initialization and sync
onMounted(() => {
  const effective = themeStore.effectiveTheme
  if (effective === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  themeStore.initMotion()
})

watch(() => themeStore.effectiveTheme, (newTheme) => {
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<template>
  <DbSyncProvider>
    <AppShell>
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </AppShell>
  </DbSyncProvider>
  <Toaster />
  <ModalProvider />
</template>

