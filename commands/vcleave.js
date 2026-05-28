const { PermissionsBitField } = require('discord.js');
const { leaveVoiceConnection } = require('../utils/voicePresence');

const REPLY_DELETE_MS = 8000;

function canControlVoice(message) {
  return message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    message.member.permissions.has(PermissionsBitField.Flags.MoveMembers);
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
  name: 'vcleave',
  description: 'Leaves the Magic UI voice channel and pauses reconnecting.',
  async execute(message, args, client) {
    if (!canControlVoice(message)) {
      return temporaryReply(message, '<:cross:1430525603701850165> You need Manage Server or Move Members permission to control voice presence.');
    }

    const left = leaveVoiceConnection(client, message.guild.id);
    if (!left) {
      return temporaryReply(message, '<:cross:1430525603701850165> I am not connected to a voice channel in this server.');
    }

    return temporaryReply(
      message,
      '<:check:1430525546608988203> Left voice and paused auto-reconnect. Run `!vcjoin` to bring me back.'
    );
  }
};
