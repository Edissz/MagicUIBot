const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/verificationChallenges.json');
const TTL_MS = 10 * 60 * 1000;
const WORDS = [
  'MAGIC',
  'DESIGN',
  'PIXEL',
  'COMPONENT',
  'BUTTON',
  'LAYOUT',
  'SYSTEM',
  'TOKEN'
];

function ensureFile() {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({ challenges: {} }, null, 2));
}

function load() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    return { challenges: {} };
  }
}

function save(data) {
  ensureFile();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function cleanup(data) {
  const now = Date.now();
  for (const [token, challenge] of Object.entries(data.challenges || {})) {
    if (!challenge.expiresAt || challenge.expiresAt <= now) {
      delete data.challenges[token];
    }
  }
}

function createChallenge({ guildId, userId }) {
  const data = load();
  cleanup(data);

  const token = crypto.randomBytes(8).toString('hex');
  const word = `${WORDS[crypto.randomInt(WORDS.length)]}-${crypto.randomInt(100, 1000)}`;
  const now = Date.now();

  data.challenges[token] = {
    guildId,
    userId,
    word,
    createdAt: now,
    expiresAt: now + TTL_MS
  };
  save(data);

  return { token, word, expiresAt: now + TTL_MS };
}

function getChallenge(token) {
  const data = load();
  cleanup(data);
  const challenge = data.challenges?.[token] || null;
  save(data);
  return challenge;
}

function consumeChallenge(token) {
  const data = load();
  const challenge = data.challenges?.[token] || null;
  if (challenge) delete data.challenges[token];
  cleanup(data);
  save(data);
  return challenge;
}

module.exports = {
  consumeChallenge,
  createChallenge,
  getChallenge
};
