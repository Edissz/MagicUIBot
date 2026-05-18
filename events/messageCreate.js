const processed = new Set();
const verificationPrompts = new Map();
const { ChannelType, PermissionsBitField, ThreadAutoArchiveDuration } = require('discord.js');
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

function sanitizeThreadName(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'member';
}

async function sendVerificationPrompt(message) {
  const key = `${message.guild.id}:${message.author.id}`;
  const current = verificationPrompts.get(key);
  if (current && Date.now() - current.lastPrompt < 60000) return;

  const baseChannel = message.channel.isThread?.() ? message.channel.parent : message.channel;
  const promptPayload = {
    components: buildUnverifiedPromptComponents(message.author, message.guild.id),
    flags: V2_FLAGS,
    allowedMentions: { users: [message.author.id] }
  };

  if (baseChannel?.threads?.create && baseChannel.type === ChannelType.GuildText) {
    const existingThread = current?.threadId
      ? await message.guild.channels.fetch(current.threadId).catch(() => null)
      : null;
    const thread = existingThread?.isThread?.()
      ? existingThread
      : await baseChannel.threads.create({
        name: `verify-${sanitizeThreadName(message.author.username)}`,
        type: ChannelType.PrivateThread,
        invitable: false,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        reason: `Private verification prompt for ${message.author.tag} (${message.author.id})`
      }).catch(err => {
        console.warn('Could not create private verification thread:', err.message);
        return null;
      });

    if (thread) {
      verificationPrompts.set(key, { lastPrompt: Date.now(), threadId: thread.id });
      await thread.members.add(message.author.id).catch(() => null);
      const sent = await thread.send(promptPayload).then(() => true).catch(err => {
        console.warn('Could not send private verification prompt:', err.message);
        return false;
      });
      if (sent) return;
    }
  }

  verificationPrompts.set(key, { lastPrompt: Date.now(), threadId: null });
  const prompt = await message.channel.send(promptPayload).catch(() => null);
  if (prompt) setTimeout(() => prompt.delete().catch(() => null), 30000);
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
