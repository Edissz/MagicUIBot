const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');
const {
  ROLE_RESTORE_EXCLUDED_ROLE_IDS,
  STAFF_ROLE_IDS
} = require('./supportV2');

const dataPath = path.join(__dirname, '../data/roleSnapshots.json');

const PROTECTED_PERMISSION_FLAGS = [
  PermissionsBitField.Flags.Administrator,
  PermissionsBitField.Flags.ManageGuild,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageChannels,
  PermissionsBitField.Flags.ManageWebhooks,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.ModerateMembers,
  PermissionsBitField.Flags.ManageMessages,
  PermissionsBitField.Flags.MentionEveryone
];

function ensureFile() {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
}

function load() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    return {};
  }
}

function save(data) {
  ensureFile();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function hasProtectedPermission(role) {
  return PROTECTED_PERMISSION_FLAGS.some(permission => role.permissions.has(permission));
}

function isRestorableRole(role, guild) {
  if (!role || !guild) return false;
  if (role.id === guild.id) return false;
  if (role.managed) return false;
  if (ROLE_RESTORE_EXCLUDED_ROLE_IDS.includes(role.id)) return false;
  if (STAFF_ROLE_IDS.includes(role.id)) return false;
  if (hasProtectedPermission(role)) return false;
  return true;
}

function snapshotMemberRoles(member) {
  const restorableRoles = member.roles.cache
    .filter(role => isRestorableRole(role, member.guild))
    .sort((a, b) => b.position - a.position)
    .map(role => ({
      id: role.id,
      name: role.name,
      position: role.position
    }));

  const db = load();
  if (!db[member.guild.id]) db[member.guild.id] = {};
  db[member.guild.id][member.id] = {
    userId: member.id,
    guildId: member.guild.id,
    savedAt: new Date().toISOString(),
    roles: restorableRoles
  };
  save(db);

  return db[member.guild.id][member.id];
}

function getRoleSnapshot(guildId, userId) {
  const db = load();
  return db[guildId]?.[userId] || null;
}

function setRestoreDecision(guildId, userId, decision) {
  const db = load();
  if (!db[guildId]?.[userId]) return null;
  db[guildId][userId].lastDecision = decision;
  db[guildId][userId].lastDecisionAt = new Date().toISOString();
  save(db);
  return db[guildId][userId];
}

async function getBotMember(guild) {
  if (guild.members.me) return guild.members.me;
  return guild.members.fetchMe().catch(() => null);
}

async function restoreSnapshotRoles(member, snapshot) {
  const botMember = await getBotMember(member.guild);
  const restored = [];
  const skipped = [];

  if (!snapshot?.roles?.length) {
    return { restored, skipped: ['No restorable roles were saved.'] };
  }

  for (const savedRole of snapshot.roles) {
    let role = member.guild.roles.cache.get(savedRole.id) || null;
    if (!role) {
      role = await member.guild.roles.fetch(savedRole.id).catch(() => null);
    }

    if (!role) {
      skipped.push(`${savedRole.name} (deleted role)`);
      continue;
    }

    if (!isRestorableRole(role, member.guild)) {
      skipped.push(`${role.name} (protected role)`);
      continue;
    }

    if (botMember && role.position >= botMember.roles.highest.position) {
      skipped.push(`${role.name} (above bot role)`);
      continue;
    }

    if (member.roles.cache.has(role.id)) {
      skipped.push(`${role.name} (already assigned)`);
      continue;
    }

    restored.push(role);
  }

  if (restored.length) {
    await member.roles.add(restored, 'Restored saved non-admin Magic UI roles').catch(error => {
      skipped.push(`Restore failed: ${error.message}`);
      restored.length = 0;
    });
  }

  return {
    restored: restored.map(role => role.name),
    skipped
  };
}

module.exports = {
  getRoleSnapshot,
  isRestorableRole,
  restoreSnapshotRoles,
  setRestoreDecision,
  snapshotMemberRoles
};
