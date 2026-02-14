<script setup lang="ts">
/**
 * DbStatusIndicator.vue - 실시간 DB 연결 상태 표시
 * 
 * 10초마다 DB에 handshake를 보내고 연결 상태를 시각적으로 표시합니다.
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type Status = 'checking' | 'connected' | 'disconnected'

const status = ref<Status>('checking')
const lastChecked = ref<Date | null>(null)
const latency = ref<number | null>(null)
const isChecking = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

const CHECK_INTERVAL = 30000 // 30초
const COOLDOWN = 2000 // 2초 쿨다운

async function checkConnection() {
    // 이미 체크 중이거나 쿨다운 중이면 무시
    if (isChecking.value) return
    
    // 마지막 체크로부터 2초가 안 지났으면 무시 (자동 체크와 수동 클릭 충돌 방지)
    if (lastChecked.value && Date.now() - lastChecked.value.getTime() < COOLDOWN) return

    isChecking.value = true
    status.value = 'checking'
    
    try {
        const res = await fetch('/.netlify/functions/health-check', {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5초 타임아웃
        })
        
        if (res.ok) {
            const data = await res.json()
            status.value = 'connected'
            latency.value = data.latency // 서버에서 측정한 DB 응답 시간
        } else {
            status.value = 'disconnected'
            latency.value = null
        }
    } catch (error) {
        status.value = 'disconnected'
        latency.value = null
    } finally {
        lastChecked.value = new Date()
        isChecking.value = false
    }
}

onMounted(() => {
    checkConnection()
    intervalId = setInterval(checkConnection, CHECK_INTERVAL)
})

onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
})

const statusConfig = {
    checking: {
        color: 'var(--color-warning)',
        pulse: true,
        label: '연결 확인 중...'
    },
    connected: {
        color: 'var(--color-success)',
        pulse: false,
        label: 'DB 연결됨'
    },
    disconnected: {
        color: 'var(--color-danger)',
        pulse: true,
        label: 'DB 연결 끊김'
    }
}
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <button 
          @click="checkConnection"
          :disabled="isChecking"
          :class="[
            'relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
            isChecking ? 'cursor-not-allowed opacity-70 bg-muted/30' : 'cursor-pointer bg-muted/50 hover:bg-muted'
          ]"
          aria-label="데이터베이스 연결 상태"
        >
          <!-- Status Dot -->
          <span class="relative flex h-2.5 w-2.5">
            <!-- Pulse ring -->
            <span 
              v-if="statusConfig[status].pulse"
              class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              :style="{ backgroundColor: statusConfig[status].color }"
            />
            <!-- Solid dot -->
            <span 
              class="relative inline-flex h-2.5 w-2.5 rounded-full"
              :style="{ backgroundColor: statusConfig[status].color }"
            />
          </span>
          
          <!-- Label (desktop only) -->
          <span 
            class="hidden sm:inline text-xs font-medium text-muted-foreground"
            aria-live="polite"
            :aria-label="statusConfig[status].label"
          >
            {{ latency !== null ? `${latency}ms` : 'DB' }}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" class="text-xs">
        <div class="flex flex-col gap-1">
          <span class="font-medium">{{ statusConfig[status].label }}</span>
          <span v-if="latency !== null" class="text-muted-foreground">
            응답시간: {{ latency }}ms
          </span>
          <span v-if="lastChecked" class="text-muted-foreground">
            마지막 확인: {{ lastChecked.toLocaleTimeString('ko-KR') }}
          </span>
          <span class="text-muted-foreground opacity-60">클릭하여 다시 확인</span>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
