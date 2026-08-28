## 2025-08-28 - Accessible Modal Dialog Pattern
**Learning:** Reusable `Modal` components in single-page disaster apps must support keyboard dismissal (`Escape`) and ARIA dialog attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) so modal dialogs are fully accessible to keyboard and screen-reader users without extra per-page boilerplate.
**Action:** Always verify `useEffect` keyboard listeners and ARIA labeling when creating or touching shared overlay/dialog components in `frontend-aapdasetu`.
