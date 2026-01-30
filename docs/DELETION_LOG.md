# Code Deletion Log

## 2026-01-30 Refactor Session

### Summary
Icon 시스템 리팩토링 후 불필요한 코드, 미사용 컴포넌트, 중복 상수 정리

---

### Unused Components Deleted

| 파일 | 이유 | Lines |
|------|------|-------|
| `src/components/common/WarningBadge.vue` | 어디서도 import 없음 | 18 |
| `src/shared/components/ui/EmptyState.vue` | 미사용 | ~50 |
| `src/shared/components/ui/PageSkeleton.vue` | 미사용 | ~40 |
| `src/shared/components/ui/SkeletonCard.vue` | PageSkeleton만 사용 (같이 삭제) | ~30 |
| `src/shared/components/ui/SkeletonText.vue` | SkeletonCard만 사용 (같이 삭제) | ~20 |

### Unused Utilities Deleted

| 파일 | 이유 | Lines |
|------|------|-------|
| `src/features/stats/utils/chartTheme.ts` | ECharts 제거 후 미사용 잔재 | 160 |

### Empty Directories Deleted

| 폴더 | 이유 |
|------|------|
| `src/components/ui/dropdown-menu/` | 빈 폴더 |
| `src/shared/lib/` | schema.sql 삭제 후 빈 폴더 |

### Reference Files Deleted

| 파일 | 이유 |
|------|------|
| `src/shared/lib/schema.sql` | 코드에서 참조 없음 (문서 목적이면 docs/로 이동 권장) |

### Config Cleanup (src/shared/constants/config.ts)

**제거된 미사용 상수:**
- `UI_CONFIG` - DRAG_ACTIVATION_DISTANCE, ACTIVITY_MAX_ITEMS, MAX_UNDO_HISTORY
- `TOAST_CONFIG` - DEFAULT_DURATION_MS, ERROR_DURATION_MS
- `DESIGN_TOKENS` - ICON_SIZES, SPACING, EASING, DURATION
- `SEMANTIC_COLORS` - STATUS colors (chartTheme.ts에 중복 정의됨)

**제거된 미사용 타입:**
- `RoleName`
- `RotationRole`
- `IconSize`

**유지된 사용 중인 상수:**
- `RULES_CONFIG` - rules.ts에서 사용
- `ROLE_CONFIG` - rules.ts에서 사용

---

### Impact

| 항목 | 수치 |
|------|------|
| Files deleted | 8 |
| Empty directories removed | 2 |
| Lines of code removed | ~420 |
| Config lines removed | ~80 |
| **Total lines removed** | **~500** |

---

### Testing

- [x] Build succeeds: `npm run build` 통과 여부 확인 필요
- [ ] All tests passing: 테스트 실행 필요
- [x] No console errors: 개발 서버 정상 작동 확인 필요

---

### Notes

1. **shadcn-vue 표준 컴포넌트 유지**: Card, Dialog 관련 컴포넌트들은 현재 사용되지 않더라도 shadcn-vue 표준 구조이므로 향후 사용 가능성을 위해 유지
2. **Skeleton.vue 유지**: `src/shared/components/ui/Skeleton.vue`는 기본 컴포넌트로 유지
3. **Icon 시스템 완전 전환**: Material Symbols → Heroicons 직접 사용으로 전환 완료

---

### Related Icon Refactoring (Same Session)

**Icon.vue 변경사항:**
- Material Symbol → Heroicons 매핑 제거
- Heroicons 컴포넌트 직접 import 방식으로 변경
- Solid 아이콘: `Solid{IconName}Icon` 형식 사용

**업데이트된 파일들 (12개):**
- `MembersPage.vue`, `ActivityFeed.vue`, `SettingsPage.vue`
- `StatsView.vue`, `AssignmentSuggestions.vue`, `AssignPage.vue`
- `WarningWidget.vue`, `AssignmentSummary.vue`, `AssignmentBoard.vue`
- `AbsenceWidget.vue`, `MemberList.vue`, `AppShell.vue`
