const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/cases.json');

if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));

function load() {
  try {
    const raw = fs.readFileSync(dataPath);
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function addCase(guildId, userId, info) {
  const db = load();
  if (!db[guildId]) db[guildId] = {};
  if (!db[guildId][userId]) db[guildId][userId] = { cases: [] };

  const caseId = db[guildId][userId].cases.length + 1;
  db[guildId][userId].cases.push({
    id: caseId,
    ...info,
    date: new Date().toISOString(),
  });

  save(db);
  return caseId;
}

function getUser(guildId, userId) {
  const db = load();
  if (!db[guildId] || !db[guildId][userId]) return { cases: [] };
  return db[guildId][userId];
}

function getAll(guildId) {
  const db = load();
  return db[guildId] || {};
}

module.exports = { addCase, getUser, getAll };
