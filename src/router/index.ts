import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'assignment',
            component: () => import('@/features/assignment/pages/AssignPage.vue')
        },
        {
            path: '/stats',
            name: 'stats',
            component: () => import('@/features/stats/pages/StatsPage.vue')
        },
        {
            path: '/members',
            name: 'members',
            component: () => import('@/features/members/pages/MembersPage.vue')
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/features/settings/pages/SettingsPage.vue')
        }
    ]
})

export default router
