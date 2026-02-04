# Data Management Dashboard Implementation Plan

## Overview
Build a dedicated "Data Management" dashboard (`/settings/data`) to provide advanced control over the application's local database. This tool is essential for debugging, data recovery, and maintaining long-term data health.

## User Stories
1. **As a power user**, I want to export only this year's data so I can archive old records.
2. **As a developer**, I want to inspect the raw JSON of a specific week to debug assignment logic.
3. **As an admin**, I want to merge data from another device without overwriting my current changes.
4. **As a user**, I want to know if my data has consistency errors (e.g. deleted members still assigned) and fix them.

## Technical Architecture

### 1. Route & Layout
- **Path**: `/settings/data` (Lazy loaded feature)
- **Layout**: Tabbed interface (Overview, Data Editor, Import/Export, Maintenance)

### 2. Core Components
- **`features/admin/pages/AdminPage.vue`**: Main container.
- **`DataEditor.vue`**: Two-mode editor (Table view for Members, JSON/Tree view for Weeks).
- **`TransferManager.vue`**: UI for Import/Export with granular checkboxes and merge strategy selection.
- **`HealthMonitor.vue`**: List of passing/failing checks with "Fix" actions.

### 3. Data Service (`src/features/admin/services/dataService.ts`)
Logic layer to handle:
- **Merger**: `mergeAppData(current, incoming, strategy)`
- **Validator**: Zod schema validation + integrity checks (referential integrity).
- **Filter**: `filterData(data, options)` for selective export.

## Task Breakdown

### Phase 1: Foundation & Viewer (P0)
- [ ] **Task 1.1**: Create `features/admin` directory structure and route configuration.
- [ ] **Task 1.2**: Implement `DataEditor` with read-only view for `Members` (Ag-Grid/TanStack) and `Weeks`.
- [ ] **Task 1.3**: Implement Row Editing for `Members` (add/edit/delete directly in table).

### Phase 2: Advanced I/O (P1)
- [ ] **Task 2.1**: Implement `exportData` logic with granule selection (Members, Weeks range).
- [ ] **Task 2.2**: Implement `importData` logic with "Merge" strategy (conflict resolution: latest wins).
- [ ] **Task 2.3**: specific UI for Import/Export (File drop + Options modal).

### Phase 3: Health & Maintenance (P2)
- [ ] **Task 3.1**: Implement `HealthCheckService` to detect:
    - Orphans: Week assignments pointing to non-existent members.
    - Schema: Invalid Zod parsings.
- [ ] **Task 3.2**: Build `HealthMonitor` UI to show issues and "Fix All" button.
- [ ] **Task 3.3**: Add "Factory Reset" and "Seed Dummy Data" (Restricted to Dev/explicit confirm).

## Dependencies
- `pinia` (useAssignmentStore)
- `zod` (Validation)
- `@tanstack/vue-table` (Data Grid)
- `lucide-vue-next` (Icons)
