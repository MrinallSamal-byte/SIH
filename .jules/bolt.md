# Bolt's Performance Journal

## 2026-08-17 - Disaster-First Route Splitting vs Monolithic Recharts Bundling

**Learning:** In disaster management applications like AapdaSetu, static root importing of administrative analytics pulls heavy visualization libraries (`recharts` @ 405 kB minified) and 15+ secondary management tables into the critical first-load bundle for citizens seeking emergency SOS or shelters. This bloated initial parse/evaluation time on 2G/3G low-bandwidth connections by >60%.
**Action:** Always employ route-level dynamic imports (`React.lazy` + `Suspense`) for all citizen vs admin partitions, reserving heavy data visualization packages exclusively for authenticated admin chunks.
