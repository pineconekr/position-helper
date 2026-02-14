import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ThemePreference, MotionPreference } from '@/shared/types'

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSystemMotion(): 'allow' | 'reduce' {
    if (typeof window === 'undefined') return 'allow'
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'allow'
}

export const useThemeStore = defineStore('theme', () => {
    const theme = ref<ThemePreference>('system')
    const motionPreference = ref<MotionPreference>('allow')
    const systemTheme = ref<'light' | 'dark'>(getSystemTheme())
    const systemMotion = ref<'allow' | 'reduce'>(getSystemMotion())
    let systemThemeMedia: MediaQueryList | null = null
    let systemMotionMedia: MediaQueryList | null = null

    const effectiveTheme = computed(() => (theme.value === 'system' ? systemTheme.value : theme.value))
    const effectiveMotion = computed(() =>
        motionPreference.value === 'system' ? systemMotion.value : motionPreference.value
    )

    function applyThemeClass(mode: 'light' | 'dark') {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    function applyMotionAttribute(mode: 'allow' | 'reduce') {
        document.documentElement.setAttribute('data-motion', mode)
    }

    function bindSystemPreferenceListeners() {
        if (typeof window === 'undefined') return
        if (!systemThemeMedia) {
            systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
            systemThemeMedia.addEventListener('change', (event) => {
                systemTheme.value = event.matches ? 'dark' : 'light'
                if (theme.value === 'system') {
                    applyThemeClass(systemTheme.value)
                }
            })
        }

        if (!systemMotionMedia) {
            systemMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
            systemMotionMedia.addEventListener('change', (event) => {
                systemMotion.value = event.matches ? 'reduce' : 'allow'
                if (motionPreference.value === 'system') {
                    applyMotionAttribute(systemMotion.value)
                }
            })
        }
    }

    function setTheme(t: ThemePreference) {
        theme.value = t
        applyThemeClass(t === 'system' ? systemTheme.value : t)
    }

    function setMotionPreference(value: MotionPreference) {
        motionPreference.value = value
        applyMotionAttribute(value === 'system' ? systemMotion.value : value)
    }

    // 초기화 시 data-motion 속성 설정
    function initMotion() {
        bindSystemPreferenceListeners()
        applyMotionAttribute(effectiveMotion.value)
    }

    bindSystemPreferenceListeners()

    return {
        theme,
        motionPreference,
        systemTheme,
        systemMotion,
        effectiveTheme,
        effectiveMotion,
        setTheme,
        setMotionPreference,
        initMotion
    }
})
