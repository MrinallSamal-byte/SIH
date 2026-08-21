## 2026-08-21 - Accessible Modal Dialog Pattern
**Learning:** Shared Modal components in React app need explicit dialog semantics (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) and global keydown listeners for `Escape` key handling to ensure keyboard & screen reader accessibility across all feature pages using modals.
**Action:** Always include `role="dialog"`, `aria-modal="true"`, `aria-labelledby` with `useId()`, and an `Escape` key event listener in custom Modal components.
