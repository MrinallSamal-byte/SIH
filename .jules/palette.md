## 2025-02-22 - Modal Keyboard Navigation & ARIA Semantics
**Learning:** Custom overlay modals without `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and an `Escape` key event listener hinder keyboard accessibility and screen reader navigation.
**Action:** Always include keyboard `Escape` dismissal handlers, focus management, and explicit WAI-ARIA dialog attributes when creating or refactoring modal overlays.
