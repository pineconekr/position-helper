<script setup lang="ts">
/**
 * AnimatedCollapse.vue - 접기/펼치기 애니메이션 컨테이너
 * 
 * - Vue 3 Transition API를 사용하여 높이/페이드 애니메이션 제공
 * - prefers-reduced-motion 미디어 쿼리 존중
 */
import { computed } from 'vue'

interface Props {
  /**
   * 표시 여부
   */
  isOpen: boolean
  /**
   * 애니메이션 유형
   * - 'height': 높이 변화 (접기/펼치기)
   * - 'fade': 페이드 인/아웃
   */
  variant?: 'height' | 'fade'
  /**
   * 래퍼 클래스명
   */
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'height',
  className: 'overflow-hidden'
})

// 모션 감소 설정 확인
const shouldReduceMotion = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
})

// 높이 애니메이션 핸들러
function onEnter(el: HTMLElement) {
  if (props.variant === 'fade') {
    el.style.opacity = '0'
    return
  }
  // 높이 애니메이션
  el.style.height = '0'
  el.style.opacity = '0'
  el.offsetHeight // force reflow
  el.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
  el.style.height = el.scrollHeight + 'px'
  el.style.opacity = '1'
}

function onAfterEnter(el: HTMLElement) {
  if (props.variant === 'height') {
    el.style.height = 'auto'
  }
  el.style.transition = ''
}

function onLeave(el: HTMLElement) {
  if (props.variant === 'fade') {
    el.style.opacity = '0'
    return
  }
  // 높이 애니메이션
  el.style.height = el.scrollHeight + 'px'
  el.offsetHeight // force reflow
  el.style.transition = 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease'
  el.style.height = '0'
  el.style.opacity = '0'
}

function onAfterLeave(el: HTMLElement) {
  el.style.height = ''
  el.style.opacity = ''
  el.style.transition = ''
}

// 페이드 애니메이션용
function onFadeEnter(el: HTMLElement) {
  el.style.opacity = '0'
  el.style.transform = 'translateY(5px)'
  el.offsetHeight
  el.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
  el.style.opacity = '1'
  el.style.transform = 'translateY(0)'
}

function onFadeLeave(el: HTMLElement) {
  el.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
  el.style.opacity = '0'
  el.style.transform = 'translateY(-5px)'
}
</script>

<template>
  <!-- 모션 감소 모드: 애니메이션 없이 즉시 표시/숨김 -->
  <template v-if="shouldReduceMotion">
    <div v-if="isOpen" :class="className">
      <slot />
    </div>
  </template>

  <!-- 일반 모드: 애니메이션 적용 -->
  <Transition
    v-else
    :css="false"
    @enter="variant === 'fade' ? onFadeEnter($event as HTMLElement) : onEnter($event as HTMLElement)"
    @after-enter="onAfterEnter($event as HTMLElement)"
    @leave="variant === 'fade' ? onFadeLeave($event as HTMLElement) : onLeave($event as HTMLElement)"
    @after-leave="onAfterLeave($event as HTMLElement)"
    mode="out-in"
  >
    <div v-if="isOpen" :class="className">
      <slot />
    </div>
  </Transition>
</template>
