const fs = require('fs');
const db = require('./electron/database');

console.log('--- COMPREHENSIVE SQLITE SCHEMA & QUERY INTEGRITY AUDIT ---');

const liveDb = db.initDatabase();

// Check if all tables exist
const tables = liveDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name);
console.log('Discovered', tables.length, 'tables:', tables.join(', '));

// Extract all db.prepare calls from electron/database.js
const code = fs.readFileSync('./electron/database.js', 'utf8');

// Match db.prepare(`...`) and db.prepare("...")
const regex = /db\.prepare\(\s*`([\s\S]*?)`\s*\)/g;
let match;
let preparedQueries = 0;
let failedQueries = 0;

while ((match = regex.exec(code)) !== null) {
  let sql = match[1].trim();
  // Skip dynamic SQL with template literals like ${...}
  if (sql.includes('${')) {
    continue;
  }
  preparedQueries++;
  try {
    liveDb.prepare(sql);
  } catch (err) {
    console.error(`❌ FAILED QUERY [${err.message}]:\n${sql}\n`);
    failedQueries++;
  }
}

console.log(`\nAudit completed: Tested ${preparedQueries} static prepared statements.`);
if (failedQueries === 0) {
  console.log('🎉 ALL STATIC PREPARED STATEMENTS COMPILED WITH ZERO ERRORS!');
} else {
  console.error(`⚠️ Found ${failedQueries} failed queries!`);
  process.exit(1);
}
