import type { AppData } from '@/shared/types'

export const DUMMY_DATA: AppData = {
    members: [
        { name: '김철수', active: true, notes: '', generation: 1 },
        { name: '이영희', active: true, notes: '', generation: 1 },
        { name: '박민수', active: true, notes: '', generation: 2 },
        { name: '최지우', active: true, notes: '', generation: 2 },
        { name: '정수민', active: true, notes: '', generation: 3 },
        { name: '강현우', active: true, notes: '', generation: 3 },
        { name: '윤서연', active: true, notes: '', generation: 4 },
        { name: '장준호', active: true, notes: '', generation: 4 },
        { name: '임도현', active: true, notes: '', generation: 5 },
        { name: '송하은', active: true, notes: '', generation: 5 },
        { name: '홍길동', active: true, notes: '휴식 중', generation: 1 },
        { name: '김아무개', active: false, notes: '군입대', generation: 2 },
    ],
    weeks: {
        '2024-01-07': {
            part1: { SW: '김철수', 자막: '이영희', 고정: '박민수', 사이드: ['최지우', '정수민'], 스케치: '강현우' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: []
        },
        '2024-01-14': {
            part1: { SW: '강현우', 자막: '윤서연', 고정: '장준호', 사이드: ['임도현', '김철수'], 스케치: '이영희' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: [{ name: '박민수', reason: '여행' }]
        },
        '2024-01-21': {
            part1: { SW: '장준호', 자막: '임도현', 고정: '송하은', 사이드: ['이영희', '박민수'], 스케치: '최지우' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: [{ name: '김철수', reason: '시험' }]
        },
        '2024-02-04': {
            part1: { SW: '이영희', 자막: '박민수', 고정: '최지우', 사이드: ['정수민', '강현우'], 스케치: '윤서연' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: []
        },
        '2024-02-11': {
            part1: { SW: '최지우', 자막: '정수민', 고정: '강현우', 사이드: ['윤서연', '장준호'], 스케치: '임도현' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: [{ name: '이영희', reason: '명절' }, { name: '박민수', reason: '명절' }]
        },
        '2024-02-18': {
            part1: { SW: '윤서연', 자막: '장준호', 고정: '임도현', 사이드: ['송하은', '김철수'], 스케치: '이영희' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: []
        },
        '2024-02-25': {
            part1: { SW: '임도현', 자막: '송하은', 고정: '김철수', 사이드: ['이영희', '박민수'], 스케치: '최지우' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: [{ name: '강현우', reason: '아픔' }]
        },
        '2024-03-03': {
            part1: { SW: '송하은', 자막: '김철수', 고정: '이영희', 사이드: ['박민수', '최지우'], 스케치: '정수민' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: []
        },
        '2024-03-10': {
            part1: { SW: '박민수', 자막: '최지우', 고정: '정수민', 사이드: ['강현우', '윤서연'], 스케치: '장준호' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: []
        },
        '2024-03-17': {
            part1: { SW: '정수민', 자막: '강현우', 고정: '윤서연', 사이드: ['장준호', '임도현'], 스케치: '송하은' },
            part2: { SW: '', 자막: '', 고정: '', 사이드: ['', ''], 스케치: '' },
            absences: [{ name: '김철수', reason: '개인사정' }]
        }
    }
}
