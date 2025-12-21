import { useMemo, useState } from 'react'
import { useAppStore } from '@/shared/state/store'

export function useAbsenceManager() {
	const currentWeekDate = useAppStore((s) => s.currentWeekDate)
	const app = useAppStore((s) => s.app)
	const updateAbsences = useAppStore((s) => s.updateAbsences)

	const [absenceForm, setAbsenceForm] = useState<{ name: string; reason: string }>({ name: '', reason: '' })
	const [editingAbsence, setEditingAbsence] = useState<{ name: string; reason: string } | null>(null)

	const currentAbsences = useMemo(() => {
		if (!currentWeekDate) return []
		return app.weeks[currentWeekDate]?.absences ?? []
	}, [app.weeks, currentWeekDate])

	function addAbsence() {
		if (!currentWeekDate) return
		if (!absenceForm.name) return
		const exists = currentAbsences.some((a) => a.name === absenceForm.name)
		const next = exists
			? currentAbsences.map((a) => a.name === absenceForm.name ? { name: a.name, reason: absenceForm.reason || undefined } : a)
			: [...currentAbsences, { name: absenceForm.name, reason: absenceForm.reason || undefined }]
		updateAbsences(currentWeekDate, next)
		setAbsenceForm({ name: '', reason: '' })
	}

	function removeAbsence(n: string) {
		if (!currentWeekDate) return
		updateAbsences(currentWeekDate, currentAbsences.filter((a) => a.name !== n))
	}

	function openEditAbsence(name: string) {
		const target = currentAbsences.find((a) => a.name === name)
		if (!target) return
		setEditingAbsence({ name, reason: target.reason ?? '' })
	}

	function saveAbsenceReason() {
		if (!currentWeekDate || !editingAbsence) return
		const trimmed = editingAbsence.reason.trim()
		const next = currentAbsences.map((a) =>
			a.name === editingAbsence.name ? { ...a, reason: trimmed || undefined } : a
		)
		updateAbsences(currentWeekDate, next)
		setEditingAbsence(null)
	}

	return {
		currentWeekDate,
		members: app.members,
		currentAbsences,
		absenceForm,
		setAbsenceForm,
		editingAbsence,
		setEditingAbsence,
		addAbsence,
		removeAbsence,
		openEditAbsence,
		saveAbsenceReason
	}
}
