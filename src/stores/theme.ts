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

function getEffectiveThemeValue(theme: ThemePreference): 'light' | 'dark' {
    return theme === 'system' ? getSystemTheme() : theme
}

function getEffectiveMotionValue(motion: MotionPreference): 'allow' | 'reduce' {
    return motion === 'system' ? getSystemMotion() : motion
}

export const useThemeStore = defineStore('theme', () => {
    const theme = ref<ThemePreference>('system')
    const motionPreference = ref<MotionPreference>('allow')

    const effectiveTheme = computed(() => getEffectiveThemeValue(theme.value))
    const effectiveMotion = computed(() => getEffectiveMotionValue(motionPreference.value))

    function setTheme(t: ThemePreference) {
        theme.value = t
        const effective = getEffectiveThemeValue(t)
        if (effective === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    function setMotionPreference(value: MotionPreference) {
        motionPreference.value = value
        const effective = getEffectiveMotionValue(value)
        document.documentElement.setAttribute('data-motion', effective)
    }

    // 초기화 시 data-motion 속성 설정
    function initMotion() {
        const effective = getEffectiveMotionValue(motionPreference.value)
        document.documentElement.setAttribute('data-motion', effective)
    }

    return {
        theme,
        motionPreference,
        effectiveTheme,
        effectiveMotion,
        setTheme,
        setMotionPreference,
        initMotion
    }
})
