/**
 * Exclusion checker — verifies no SAR / Sentinel / WebRTC / telemedicine
 * references remain in the implementation (per backend_prompt.md).
 */
const fs = require('node:fs');
const path = require('node:path');

const EXCLUDED = [
  /\bsatellite\b/i,
  /\bsentinel\b/i,
  /\bsentinel-1\b/i,
  /\bSAR\b/i,
  /\bsar_satellite\b/i,
  /\bwebrtc\b/i,
  /\btelemedic\w*\b/i,
  /\bvideo consultation\b/i,
];

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '__pycache__', '.venv']);
const ALLOWED_FILES = new Set(['tech.md', 'flow.md', 'PRD.md', 'backend_prompt.md', 'check-exclusions.js']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

const root = path.join(__dirname, '..');
const files = walk(root);
let violations = 0;

for (const file of files) {
  const base = path.basename(file);
  if (ALLOWED_FILES.has(base)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of EXCLUDED) {
    const match = content.match(pattern);
    if (match) {
      // Heuristic: allow mentions that are purely "excluded from this repo" style docs.
      const context = content.slice(Math.max(0, match.index - 40), match.index + 40).toLowerCase();
      if (context.includes('excluded') || context.includes('exclusion') || context.includes('not included')) continue;
      console.log(`VIOLATION: ${path.relative(root, file)} contains "${match[0]}"`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} exclusion violation(s) found.`);
  process.exit(1);
}
console.log('Exclusion check passed: no SAR / Sentinel / WebRTC / telemedicine references in implementation.');
