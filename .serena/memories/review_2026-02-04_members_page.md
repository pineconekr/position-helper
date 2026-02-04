# Code Review Report: MembersPage.vue

**Target**: `src/features/members/pages/MembersPage.vue`
**Date**: 2026-02-04
**Scope**: Security, Performance, Accessibility, Code Quality

## Summary
- **Security Check**: Passed (`npm audit` 0 vulnerabilities).
- **Accessibility**: 1 High Priority Issue (Keyboard accessibility).
- **Code Quality**: 1 Medium Issue (String manipulation robustness), 1 Low (Data modeling).

## Findings

### CRITICAL
None.

### HIGH
**1. Keyboard Inaccessible Interactive Elements**
- **Location**: `MembersPage.vue` (Lines 528-538, 546-557)
- **Problem**: `Badge` components are used as interactive toggles using `@click`, but lack `tabindex`, `role="button"`, and keyboard event listeners (`@keydown.enter`, `@keydown.space`).
- **Violation**: WCAG 2.1 2.1.1 (Keyboard).
- **Remediation**:
  ```vue
  <Badge
    role="button"
    tabindex="0"
    @keydown.enter.prevent="toggleMethod"
    @keydown.space.prevent="toggleMethod"
    ...
  />
  ```

### MEDIUM
**2. Fragile String Manipulation for State**
- **Location**: `MembersPage.vue` (Lines 534, 552)
- **Problem**: Uses complex chained `replace` regex to manage comma-separated strings for `formPreferred` and `formAvoid` directly in the template. This is error-prone and hard to read.
- **Remediation**: Use `Set` or `Array` (`formPreferredList`, `formAvoidList`) for local state management within the `script` section, and sync to the string format only when necessary (init/save).

### LOW
**3. "String Database" Pattern**
- **Location**: `MembersPage.vue` (Lines 231, 276-281)
- **Problem**: Storing structural data ("선호:", "기피:") as semi-structured text in a `notes` field makes it difficult to validate or query.
- **Remediation**: Ideally, update the data model. For now, encapsulate this parsing/serializing logic into helper functions to keep the component clean.

## Conclusion
The page design is clean and adheres to the "Design Reset" minimal aesthetic. The structure is semantic and performance is handled well with computed properties. The primary area for improvement is the accessibility of custom form controls and the robustness of the form state handling.
