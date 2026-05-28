const { PermissionsBitField } = require('discord.js');
const {
  configuredVoiceChannelId,
  ensureVoiceConnection
} = require('../utils/voicePresence');

const REPLY_DELETE_MS = 8000;

function canControlVoice(message) {
  return message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    message.member.permissions.has(PermissionsBitField.Flags.MoveMembers);
}

function channelIdFromArg(arg) {
  if (!arg) return configuredVoiceChannelId();
  const match = arg.match(/\d{17,20}/);
  return match?.[0] || configuredVoiceChannelId();
}

async function temporaryReply(message, content) {
  const reply = await message.reply({
    content,
    allowedMentions: { repliedUser: false }
  }).catch(() => null);

  if (reply) {
    setTimeout(() => {
      reply.delete().catch(() => null);
    }, REPLY_DELETE_MS);
  }

  return reply;
}

module.exports = {
  name: 'vcjoin',
  description: 'Joins the Magic UI voice channel and keeps the bot connected.',
  async execute(message, args, client) {
    if (!canControlVoice(message)) {
      return temporaryReply(message, '<:cross:1430525603701850165> You need Manage Server or Move Members permission to control voice presence.');
    }

    const channelId = channelIdFromArg(args[0]);

    try {
      const { channel, reused } = await ensureVoiceConnection(client, channelId);
      return temporaryReply(
        message,
        `<:check:1430525546608988203> ${reused ? 'Already connected to' : 'Joined'} ${channel}. I will keep reconnecting unless you run \`!vcleave\`.`
      );
    } catch (err) {
      console.error('Failed to join voice channel:', err);
      return temporaryReply(
        message,
        `<:cross:1430525603701850165> I could not join voice channel \`${channelId}\`: ${err.message}`
      );
    }
  }
};
