## 2026-08-25 - Modal Keyboard & Screen Reader Accessibility
**Learning:** Generic Modal components should handle the Escape key dismiss gesture, announce ARIA dialog roles (`role="dialog"`, `aria-modal="true"`), and feature visible focus rings on close buttons to support screen readers and keyboard-only users across disaster management workflows.
**Action:** Always include keyboard event listeners (`Escape` key) and `role="dialog"` attributes when creating modal components.
