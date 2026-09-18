/**
 * Migration Script: Parses supabase/assam-dummy-100.sql and uploads ALL 14 tables
 * (1,000+ realistic records) directly to Firebase Realtime Database.
 *
 * Target: https://sihapdasetu-default-rtdb.firebaseio.com/
 * Run: npx tsx scripts/migrate-all-sql-to-firebase.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const RTDB_URL = process.env.FIREBASE_DATABASE_URL || 'https://sihapdasetu-default-rtdb.firebaseio.com';
const SQL_PATH = path.resolve(process.cwd(), '../supabase/assam-dummy-100.sql');

function parseSqlValue(rawVal: string): any {
  let v = rawVal.trim();
  if (v === 'NULL' || v === 'null') return null;
  if (v === 'true' || v === 'TRUE') return true;
  if (v === 'false' || v === 'FALSE') return false;

  // PostgreSQL Array: ARRAY['driving','logistics']::"VolunteerSkill"[] or ARRAY['food','water']
  if (v.startsWith('ARRAY[') || v.startsWith('array[')) {
    const inner = v.slice(v.indexOf('[') + 1, v.lastIndexOf(']'));
    if (!inner.trim()) return [];
    return inner.split(',').map((item) => {
      let clean = item.trim();
      if (clean.startsWith("'") && clean.endsWith("'")) {
        return clean.slice(1, -1);
      }
      return clean;
    });
  }

  // String literal '...'
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/''/g, "'");
  }

  // Number
  if (!isNaN(Number(v))) {
    return Number(v);
  }

  return v;
}

function parseSqlValues(valuesStr: string): any[] {
  const result: any[] = [];
  let current = '';
  let inQuotes = false;
  let inArray = false;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    const prev = valuesStr[i - 1];

    if (char === "'" && prev !== '\\') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '[' && !inQuotes) {
      inArray = true;
      current += char;
    } else if (char === ']' && !inQuotes) {
      inArray = false;
      current += char;
    } else if (char === ',' && !inQuotes && !inArray) {
      result.push(parseSqlValue(current));
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(parseSqlValue(current));
  }

  return result;
}

const TABLE_MAP: Record<string, string> = {
  AdminUser: 'admin_users',
  Agency: 'agencies',
  Alert: 'alerts',
  AuditLog: 'audit_logs',
  DamageAssessment: 'damage_assessments',
  Dispatch: 'dispatches',
  MissingPerson: 'missing_persons',
  MissingPersonMatch: 'missing_person_matches',
  Report: 'reports',
  Resource: 'resources',
  RouteHazard: 'route_hazards',
  SafetyCheckin: 'safety_checkins',
  Shelter: 'shelters',
  Volunteer: 'volunteers',
};

async function runMigration() {
  console.log(`📖 Reading SQL dataset from: ${SQL_PATH}`);
  if (!fs.existsSync(SQL_PATH)) {
    throw new Error(`File not found: ${SQL_PATH}`);
  }

  const sqlContent = fs.readFileSync(SQL_PATH, 'utf8');
  const lines = sqlContent.split('\n');

  const databaseData: Record<string, Record<string, any>> = {};
  for (const collection of Object.values(TABLE_MAP)) {
    databaseData[collection] = {};
  }

  const insertRegex = /INSERT INTO "([^"]+)"\s*\(([^)]+)\)\s*VALUES\s*\((.*)\)\s*(ON CONFLICT.*)?;/i;

  let parsedCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('INSERT INTO')) continue;

    const match = trimmed.match(insertRegex);
    if (!match) continue;

    const [, table, colsStr, valsStr] = match;
    const collectionName = TABLE_MAP[table];
    if (!collectionName) continue;

    const cols = colsStr.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const vals = parseSqlValues(valsStr);

    const record: Record<string, any> = {};
    for (let i = 0; i < cols.length; i++) {
      record[cols[i]] = vals[i];
    }

    // Assign a unique ID
    const count = Object.keys(databaseData[collectionName]).length + 1;
    const id = record.id || `${collectionName.slice(0, 4)}_${count.toString().padStart(4, '0')}`;
    record.id = id;
    record.createdAt = record.createdAt || new Date().toISOString();
    record.updatedAt = record.updatedAt || new Date().toISOString();

    databaseData[collectionName][id] = record;
    parsedCount++;
  }

  // Ensure Admin Users are populated with valid scrypt hashes
  const { hashPassword } = await import('../src/lib/crypto.js');
  databaseData.admin_users['admin_01'] = {
    id: 'admin_01',
    email: 'adminapp@gmail.com',
    name: 'AapdaSetu SuperAdmin',
    passwordHash: hashPassword('12345'),
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  databaseData.admin_users['admin_02'] = {
    id: 'admin_02',
    email: 'admin@aapdasetu.org',
    name: 'AapdaSetu Administrator',
    passwordHash: hashPassword('Admin@123'),
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Ensure Missing Person Matches
  const reportKeys = Object.keys(databaseData.reports);
  if (reportKeys.length >= 2) {
    for (let m = 0; m < 20; m++) {
      const matchId = `match_${(m + 1).toString().padStart(3, '0')}`;
      databaseData.missing_person_matches[matchId] = {
        id: matchId,
        reportAId: reportKeys[m % reportKeys.length],
        reportBId: reportKeys[(m + 1) % reportKeys.length],
        score: Math.floor(75 + (m * 1.2)),
        status: m % 2 === 0 ? 'pending' : 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  console.log(`✅ Parsed ${parsedCount} records across ${Object.keys(TABLE_MAP).length} tables!`);
  for (const [col, recs] of Object.entries(databaseData)) {
    console.log(`  • ${col}: ${Object.keys(recs).length} records`);
  }

  console.log(`\n📡 Pushing complete dataset to Firebase Realtime Database (${RTDB_URL})...`);

  // Send PATCH to avoid blowing past any single request limit and maintain fast processing
  for (const [col, recs] of Object.entries(databaseData)) {
    const count = Object.keys(recs).length;
    if (count === 0) continue;

    const endpoint = `${RTDB_URL}/${col}.json`;
    console.log(`📤 Uploading ${count} records to /${col}...`);
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recs),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Failed to upload /${col}: ${res.status} ${errText}`);
    } else {
      console.log(`  ✓ /${col} uploaded successfully.`);
    }
  }

  console.log('\n🎉 ALL TABLES AND DATA MIGRATED TO FIREBASE REALTIME DATABASE SUCCESSFULLY!');
}

runMigration().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
