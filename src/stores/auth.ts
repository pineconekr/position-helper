import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const API_BASE = '/.netlify/functions'

export const useAuthStore = defineStore('auth', () => {
    const isAuthenticated = ref(false)
    const isLoading = ref(true)

    /**
     * 현재 인증 상태 확인 (앱 시작 시 호출)
     */
    async function checkAuth() {
        isLoading.value = true

        // 개발 모드일 경우 인증 패스
        if (import.meta.env.DEV) {
            console.log('🚧 Development mode: bypassing auth check')
            isAuthenticated.value = true
            isLoading.value = false
            return
        }

        try {
            const res = await fetch(`${API_BASE}/check-auth`, {
                credentials: 'include'
            })
            const data = await res.json()
            isAuthenticated.value = data.authenticated === true
        } catch {
            isAuthenticated.value = false
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 로그인 시도
     */
    async function login(password: string): Promise<{ success: boolean; error?: string }> {
        // 개발 모드일 경우 로그인 패스
        if (import.meta.env.DEV) {
            console.log('🚧 Development mode: bypassing login')
            isAuthenticated.value = true
            return { success: true }
        }

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
                credentials: 'include'
            })

            if (!res.ok) {
                const data = await res.json()
                return { success: false, error: data.error || '로그인 실패' }
            }

            isAuthenticated.value = true
            return { success: true }
        } catch (e) {
            return { success: false, error: '서버 연결 오류' }
        }
    }

    /**
     * 로그아웃
     */
    async function logout() {
        try {
            await fetch(`${API_BASE}/logout`, {
                method: 'POST',
                credentials: 'include'
            })
        } finally {
            isAuthenticated.value = false
        }
    }

    return {
        isAuthenticated: computed(() => isAuthenticated.value),
        isLoading: computed(() => isLoading.value),
        checkAuth,
        login,
        logout
    }
})
