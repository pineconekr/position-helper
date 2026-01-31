# Frontend Architecture

**Last Updated:** 2026-01-31
**Framework:** Vue 3, Vite, TypeScript
**Entry Point:** `src/main.ts`

## Directory Structure

```
src/
├── features/           # Feature-based modules
│   ├── assignment/     # Assignment grid, logic, and drag-drop
│   ├── members/        # Team roster management
│   ├── stats/          # [NEW] Statistics dashboard with ECharts
│   └── settings/       # App preferences
├── shared/             # Shared code
│   ├── components/     # UI primitives (buttons, dialogs, charts)
│   ├── constants/      # Config and static data
│   ├── domain/         # Business logic helper functions
│   └── types/          # TypeScript interfaces
├── stores/             # Global state (Pinia)
│   ├── assignment.ts   # Core logic for assignments & history
│   ├── activity.ts     # Action logs (Undo/Redo support)
│   └── theme.ts        # Dark mode & motion preferences
└── App.vue             # Root component
```

## Key Components

### Features

| Feature | Component | Purpose |
|---------|-----------|---------|
| **Assignment** | `AssignmentTable.vue` | Main grid for weekly assignments. |
| | `AssignmentControls.vue` | Date picker and action buttons. |
| **Stats** | `StatsPage.vue` | Dashboard entry point. |
| | `WorkloadChart.vue` | Bar chart of top assigned members. |
| | `RoleBreakdownChart.vue` | Stacked bar chart of role diversity. |

### Shared

| Category | Component | Purpose |
|----------|-----------|---------|
| **Charts** | `BaseChart.vue` | Wrapper for Apache ECharts with auto-theming. |
| **UI** | `Icon.vue` | Centralized icon handler (Heroicons). |
| | `WarningWidget.vue` | Alert system for rotation rules. |

## State Management (Pinia)

### `assignment.ts`
- **State**: `weeks` (Record<Date, Data>), `members` (Array), `currentDraft` (Editing state).
- **Key Actions**:
    - `assignRole(part, role, name)`: Updates draft.
    - `finalizeCurrentWeek()`: Commits draft to persistent storage.
    - `recalcWarnings()`: Checks logic against rotation rules.

### `theme.ts`
- **Functions**: Manages `dark` class on `html` element.
- **Integration**: Used by `BaseChart.vue` to reactively update chart colors.

## Data Flow

1.  **Load**: `App.vue` triggers `assignmentStore.loadFromDb()`.
2.  **Display**: Pages read from `assignmentStore` getters.
3.  **Interaction**: User actions (click/drag) call Store Actions.
4.  **Reaction**:
    - Store updates `currentDraft`.
    - `warnings` are recalculated.
    - UI updates reactivity.
5.  **Persist**: Changes sync to DB (mock/local or Supabase) via `api/db`.

## Dependencies

- **Vue 3**: Core framework
- **Pinia**: State management
- **Tailwind CSS v4**: Styling engine
- **Apache ECharts**: Data visualization (via `vue-echarts`)
- **VueUse**: Composition utilities (`@vueuse/motion`)
