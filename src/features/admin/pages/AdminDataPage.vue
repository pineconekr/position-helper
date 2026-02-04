<script setup lang="ts">
/**
 * AdminDataPage.vue
 * Modern Dashboard Style for Data Management
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import DataEditor from '../components/DataEditor.vue'
import TransferManager from '../components/TransferManager.vue'
import HealthMonitor from '../components/HealthMonitor.vue'
import clsx from 'clsx'

const router = useRouter()
type TabKey = 'io' | 'editor' | 'health'

const activeTab = ref<TabKey>('io') // 기본값을 'io' (가져오기/내보내기)로 변경 - 더 자주 쓰는 기능

const tabs: { key: TabKey; label: string; icon: string; desc: string }[] = [
  { 
    key: 'io', 
    label: '백업 및 복원', 
    icon: 'ArrowDownTrayIcon',
    desc: '데이터 내보내기 및 가져오기'
  },
  { 
    key: 'editor', 
    label: '에디터', 
    icon: 'TableCellsIcon',
    desc: '데이터 직접 수정'
  },
  { 
    key: 'health', 
    label: '검사', 
    icon: 'HeartIcon',
    desc: '무결성 점검'
  }
]

function goBack() {
  router.push('/settings')
}
</script>

<template>
  <div class="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col">
    <!-- Header -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <button 
          @click="goBack" 
          class="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <div class="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors">
            <Icon name="ArrowLeftIcon" :size="16" />
          </div>
          <span class="text-sm font-medium">설정으로 돌아가기</span>
        </button>
        <h1 class="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Icon name="CloudIcon" :size="24" class="text-emerald-500" />
          </span>
          데이터 관리
          <span class="text-sm font-medium text-muted-foreground px-2 py-1 rounded-md bg-muted/50 ml-2">Admin</span>
        </h1>
        <p class="text-muted-foreground mt-2 ml-14">
          데이터 백업, 복원, 직접 수정 및 무결성 검사를 수행합니다.
        </p>
      </div>

      <!-- Custom Tab Navigation -->
      <nav class="flex p-1.5 space-x-2 bg-muted/30 rounded-2xl border border-border/50 self-start md:self-center">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="clsx(
            'relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-spring flex items-center gap-2.5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            activeTab === tab.key 
              ? 'bg-background text-foreground shadow-md ring-1 ring-black/5 dark:ring-white/5' 
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )"
        >
          <Icon 
            :name="tab.icon" 
            :size="16" 
            :class="clsx(
              'transition-colors duration-300',
              activeTab === tab.key ? 'text-primary' : 'opacity-70'
            )" 
          />
          <span>{{ tab.label }}</span>
          
          <!-- Active Indicator (Bottom Line for subtle effect) -->
          <span 
            v-if="activeTab === tab.key"
            class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/30"
          ></span>
        </button>
      </nav>
    </header>

    <!-- Main Content Area with Transition -->
    <main class="flex-1">
      <Transition name="fade" mode="out-in">
        <div 
          :key="activeTab" 
          class="bg-background/50 backdrop-blur-sm rounded-3xl border border-border/50 p-1 sm:p-6 shadow-sm min-h-[400px]"
        >
          <!-- IO Tab -->
          <div v-if="activeTab === 'io'" class="max-w-4xl mx-auto">
            <TransferManager />
          </div>

          <!-- Editor Tab -->
          <div v-else-if="activeTab === 'editor'" class="w-full">
             <div class="mb-6 px-2">
                <h3 class="text-lg font-bold flex items-center gap-2">
                   <Icon name="TableCellsIcon" :size="20" class="text-blue-500" />
                   데이터 뷰어 및 수정
                </h3>
                <p class="text-sm text-muted-foreground mt-1">
                   주차별 데이터를 직접 조회하고 수정합니다. 
                   <span class="text-amber-500 font-medium">저장 시 즉시 DB에 반영됩니다.</span>
                </p>
             </div>
            <DataEditor />
          </div>

          <!-- Health Tab -->
          <div v-else-if="activeTab === 'health'" class="max-w-4xl mx-auto">
            <HealthMonitor />
          </div>
        </div>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
