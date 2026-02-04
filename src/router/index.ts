import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('@/features/auth/pages/LoginPage.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/',
            name: 'assignment',
            component: () => import('@/features/assignment/pages/AssignPage.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/stats',
            name: 'stats',
            component: () => import('@/features/stats/pages/StatsPage.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/members',
            name: 'members',
            component: () => import('@/features/members/pages/MembersPage.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/features/settings/pages/SettingsPage.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/settings/data',
            name: 'admin-data',
            component: () => import('@/features/admin/pages/AdminDataPage.vue'),
            meta: { requiresAuth: true }
        }
    ]
})

// 인증 가드
router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore()

    // 처음 로딩 시 인증 상태 확인
    if (authStore.isLoading) {
        await authStore.checkAuth()
    }

    const requiresAuth = to.meta.requiresAuth !== false

    if (requiresAuth && !authStore.isAuthenticated) {
        // 인증 필요한 페이지인데 로그인 안 됨 → 로그인 페이지로
        next({ name: 'login' })
    } else if (to.name === 'login' && authStore.isAuthenticated) {
        // 이미 로그인된 상태에서 로그인 페이지 접근 → 홈으로
        next({ name: 'assignment' })
    } else {
        next()
    }
})

export default router
