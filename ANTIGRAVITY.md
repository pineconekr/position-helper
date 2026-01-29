# Antigravity Guide for Position Helper

## 🚀 Commands
- **Dev Server**: `npm run dev` (Runs Vite)
- **Build**: `npm run build` (vue-tsc + vite build)
- **Type Check**: `npm run type-check` (vue-tsc --noEmit)
- **Preview**: `npm run preview`

## 🛠️ Tech Stack
- **Framework**: Vue 3 + Vite
- **Language**: TypeScript
- **State Management**: Pinia (Global), ref/reactive (Local)
- **Styling**: Tailwind CSS 4, CSS Variables (theme.css), Lucide Vue Icons
- **Validation**: Zod
- **Animation**: @vueuse/motion

## 📏 Coding Standards (Adapted from rules.md)
- **File Structure**:
  - Feature Isolation: `src/features/<feature-name>` preferred.
  - Shared: `src/shared` for truly reusable code.
- **Naming Conventions**:
  - Components: PascalCase (e.g., `MemberCard.vue`)
  - Composables: camelCase (e.g., `useTheme.ts`)
  - Utils: camelCase (e.g., `dateUtils.ts`)
- **TypeScript**:
  - Strict mode enabled.
  - No `any` (use Zod for runtime validation).
  - Define interfaces/types in `types.ts` or alongside components.
- **Components**:
  - Use Vue 3 `<script setup lang="ts">`.
  - Prefer named exports for utils/composables.
- **Comments**: Write all comments in **Korean** (한글).
- **CSS/Theming**:
  - Avoid hardcoded colors (e.g., `#333`).
  - Use CSS variables defined in `theme.css` (e.g., `var(--color-text-primary)`).
  - Test UI in both Light and Dark modes.

## 🤖 AI Workflows
Use these slash commands to activate specialized agents:
- **/architect**: System design & planning
- **/code-reviewer**: Code quality & security check
- **/e2e-runner**: End-to-end testing (Playwright/Agent Browser)
- **/database-reviewer**: DB optimization (Supabase/PostgreSQL)
- **/refactor-cleaner**: Dead code cleanup
