import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ActivityEntry } from '@/shared/types'

export const MAX_ACTIVITY_ENTRIES = 120

function createActivityEntry(payload: Omit<ActivityEntry, 'id' | 'timestamp'>): ActivityEntry {
    const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `act-${Date.now()}-${Math.random().toString(16).slice(2)}`
    return {
        id,
        timestamp: new Date().toISOString(),
        ...payload
    }
}

export const useActivityStore = defineStore('activity', () => {
    const activityLog = ref<ActivityEntry[]>([])

    function addActivity(payload: Omit<ActivityEntry, 'id' | 'timestamp'>) {
        const entry = createActivityEntry(payload)
        activityLog.value = [entry, ...activityLog.value].slice(0, MAX_ACTIVITY_ENTRIES)
    }

    function clearActivity() {
        activityLog.value = []
    }

    function removeActivity(id: string) {
        activityLog.value = activityLog.value.filter((entry) => entry.id !== id)
    }

    return {
        activityLog,
        addActivity,
        clearActivity,
        removeActivity
    }
})

export const normalizeReason = (reason?: string) => (reason ?? '').trim()
export const normalizeText = (text?: string) => (text ?? '').trim()
