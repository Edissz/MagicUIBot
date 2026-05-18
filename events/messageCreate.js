const processed = new Set();
const verificationPrompts = new Map();
const { PermissionsBitField } = require('discord.js');
const {
  VERIFIED_ROLE_ID,
  V2_FLAGS,
  buildUnverifiedPromptComponents
} = require('../utils/supportV2');

function canBypassVerification(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
}

async function sendVerificationPrompt(message) {
  const key = `${message.guild.id}:${message.channel.id}:${message.author.id}`;
  const lastPrompt = verificationPrompts.get(key) || 0;
  if (Date.now() - lastPrompt < 60000) return;

  verificationPrompts.set(key, Date.now());

  const prompt = await message.channel.send({
    components: buildUnverifiedPromptComponents(message.author, message.guild.id),
    flags: V2_FLAGS,
    allowedMentions: { users: [message.author.id] }
  }).catch(err => {
    console.warn('Could not send verification prompt:', err.message);
    return null;
  });

  if (prompt) setTimeout(() => prompt.delete().catch(() => null), 45000);
}

async function handleUnverifiedMessage(message) {
  const member = message.member;
  if (!member || member.roles.cache.has(VERIFIED_ROLE_ID) || canBypassVerification(member)) return false;

  await message.delete().catch(() => null);
  await sendVerificationPrompt(message);
  return true;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild) return;
    if (message.author.bot) return;

    if (await handleUnverifiedMessage(message)) return;

    const prefixes = [client.prefix || '!', '.'];
    const prefix = prefixes.find(p => message.content.startsWith(p));
    if (!prefix) return;

    if (processed.has(message.id)) return;
    processed.add(message.id);

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args, client);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => processed.delete(message.id), 15000);
    }
  },
};
