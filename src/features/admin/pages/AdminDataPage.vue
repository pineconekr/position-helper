<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAssignmentStore } from '@/stores/assignment'
import Icon from '@/components/ui/Icon.vue'
import DataEditor from '../components/DataEditor.vue'
import TransferManager from '../components/TransferManager.vue'
import HealthMonitor from '../components/HealthMonitor.vue'
import clsx from 'clsx'

const router = useRouter()
const store = useAssignmentStore()

type TabKey = 'io' | 'editor' | 'health'
type TabItem = {
  key: TabKey
  label: string
  description: string
  icon: string
  risk: string
  title: string
  objective: string
  caution: string
}

const activeTab = ref<TabKey>('io')

const tabs: TabItem[] = [
  {
    key: 'io',
    label: '백업/복원',
    description: 'JSON 내보내기 및 반영',
    icon: 'ArrowDownTrayIcon',
    risk: '중간',
    title: '데이터 이관 작업',
    objective: '운영 데이터를 안전하게 백업하거나 외부 백업본을 반영합니다.',
    caution: '가져오기 실행 시 현재 데이터가 즉시 변경됩니다.'
  },
  {
    key: 'editor',
    label: 'JSON 에디터',
    description: '주차 데이터 직접 수정',
    icon: 'CodeBracketSquareIcon',
    risk: '높음',
    title: '주차 JSON 편집',
    objective: '특정 주차 데이터를 직접 조회/수정하고 저장합니다.',
    caution: '저장 시 즉시 DB 반영되므로 변경 영향 범위를 먼저 확인하세요.'
  },
  {
    key: 'health',
    label: '무결성 검사',
    description: '데이터 품질 점검/복구',
    icon: 'ShieldCheckIcon',
    risk: '중간',
    title: '데이터 무결성 점검',
    objective: '참조 오류와 누락 항목을 검사하고 자동 복구 가능한 항목을 정리합니다.',
    caution: '자동 수정은 실행 후 되돌리기 어렵기 때문에 백업을 권장합니다.'
  }
]

const activeTabMeta = computed(() => tabs.find((tab) => tab.key === activeTab.value) ?? tabs[0])
const membersCount = computed(() => store.app.members.length)
const weekKeys = computed(() => Object.keys(store.app.weeks).sort().reverse())
const weeksCount = computed(() => weekKeys.value.length)
const latestWeek = computed(() => weekKeys.value[0] ?? '데이터 없음')
const totalWarnings = computed(() => store.warnings.length)
const severityTone = computed(() => (activeTabMeta.value.risk === '높음' ? 'danger' : 'warn'))
const severityColor = computed(() => (severityTone.value === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)'))

function goBack() {
  router.push('/settings')
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
    <div class="rounded-2xl border border-border/70 bg-card p-3 sm:p-3.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <button
            type="button"
            @click="goBack"
            class="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon name="ArrowLeftIcon" :size="14" />
            설정
          </button>
          <div class="min-w-0">
            <p class="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">Settings</p>
            <h1 class="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">데이터 관리</h1>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 text-sm">
          <span class="rounded-md border border-border/70 bg-background px-2 py-1 font-mono text-muted-foreground">M {{ membersCount }}</span>
          <span class="rounded-md border border-border/70 bg-background px-2 py-1 font-mono text-muted-foreground">W {{ weeksCount }}</span>
          <span class="rounded-md border border-border/70 bg-background px-2 py-1 font-mono text-muted-foreground">L {{ latestWeek }}</span>
          <span class="rounded-md border border-border/70 bg-background px-2 py-1 font-mono text-muted-foreground">A {{ totalWarnings }}</span>
        </div>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="space-y-3">
        <section class="rounded-2xl border border-border/70 bg-muted/15 p-3">
          <p class="px-2 pb-2 text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">작업 선택</p>
          <div class="space-y-2">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              @click="activeTab = tab.key"
              :aria-current="activeTab === tab.key ? 'true' : 'false'"
              :class="clsx(
                'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                activeTab === tab.key
                  ? 'border-[var(--color-accent)]/35 bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-foreground'
                  : 'border-border/60 bg-background/70 text-muted-foreground hover:text-foreground'
              )"
            >
              <div class="flex items-start gap-2.5">
                <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/20">
                  <Icon :name="tab.icon" :size="15" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-semibold leading-5">{{ tab.label }}</p>
                  <p class="mt-0.5 text-sm leading-5 text-muted-foreground">{{ tab.description }}</p>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section class="rounded-2xl border border-border/60 bg-muted/10 p-3.5">
          <p class="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">운영 원칙</p>
          <ul class="mt-2.5 space-y-1.5 text-sm leading-6 text-muted-foreground">
            <li>1. 실행 전 백업 생성</li>
            <li>2. 저장/가져오기는 즉시 DB 반영</li>
            <li>3. 자동 수정 후 재검사 수행</li>
          </ul>
        </section>
      </aside>

      <main class="min-w-0 space-y-3">
        <section class="rounded-2xl border border-border/70 bg-card">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
            <div class="space-y-1">
              <p class="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">현재 작업</p>
              <h2 class="text-xl font-semibold tracking-tight text-foreground">{{ activeTabMeta.title }}</h2>
              <p class="text-sm leading-6 text-muted-foreground">{{ activeTabMeta.objective }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="rounded-full border px-3 py-1 text-sm font-semibold"
                :style="{
                  borderColor: `color-mix(in srgb, ${severityColor} 45%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${severityColor} 12%, transparent)`,
                  color: severityColor
                }"
              >
                위험도 {{ activeTabMeta.risk }}
              </span>
            </div>
          </div>
          <div class="px-4 py-2.5 text-sm leading-6 text-muted-foreground sm:px-5">
            <span class="font-medium text-foreground">주의:</span> {{ activeTabMeta.caution }}
          </div>
          <div class="border-t border-border/70 p-3 sm:p-4">
            <p class="mb-2 text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">작업 캔버스</p>
            <section v-if="activeTab === 'io'" aria-label="백업 및 복원 화면">
              <TransferManager />
            </section>

            <section v-else-if="activeTab === 'editor'" aria-label="데이터 에디터 화면">
              <DataEditor />
            </section>

            <section v-else aria-label="무결성 검사 화면">
              <HealthMonitor />
            </section>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
