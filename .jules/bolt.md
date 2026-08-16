## 2026-08-16 - Spatial bounding box pre-filtering for Prisma geographic queries

**Learning:** When performing geographic distance filtering (e.g. Haversine) on database models that have `@@index([latitude, longitude])`, querying all records without a `where` clause bypasses database indexes, loading unnecessary rows over the wire and consuming Node.js CPU/memory.
**Action:** Compute bounding box coordinate bounds (lat/lon min/max) to query database index ranges first, and run Haversine distance calculations only on candidate records within the bounding box.
