## 2025-09-01 - Accessible Modal Component Pattern
**Learning:** Common modal components require explicit keyboard dismissal handlers (Escape key) and WAI-ARIA modal traits (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) linked via dynamic `useId` to guarantee accessibility for keyboard and screen reader users across all application views.
**Action:** When building or enhancing modal components, ensure dynamic title linkage via `useId()` and register global Escape key event listeners with proper cleanup in React `useEffect`.
