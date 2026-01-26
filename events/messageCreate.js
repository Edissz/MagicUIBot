const {
  PermissionsBitField,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

const LOG_CHANNEL_ID = "1355260778965373000";

function v2Card({ title, body, footer }) {
  const c = new ContainerBuilder();

  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const safeBody = String(body || "").trim();
  c.addTextDisplayComponents((t) => t.setContent(safeBody.length ? safeBody : " "));

  if (footer) {
    c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    const safeFooter = String(footer || "").trim();
    c.addTextDisplayComponents((t) => t.setContent(safeFooter.length ? safeFooter : " "));
  }

  return c;
}

module.exports = {
  name: "dm",
  description: "Send a system-styled Magic UI DM to a user.",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({
        components: [
          v2Card({
            title: "Permission Denied",
            body: "You don’t have permission to use this command.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply({
        components: [
          v2Card({
            title: "DM Failed",
            body: "Please mention a user to DM.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const text = args.slice(1).join(" ").trim();
    const attachments = Array.from(message.attachments.values());

    if (!text && attachments.length === 0) {
      return message.reply({
        components: [
          v2Card({
            title: "DM Failed",
            body: "Please provide a message or attach a file.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const dmBody =
      `**Message:** ${text ? text : "*No message provided.*"}\n\n` +
      `If you believe this message was sent in error or seems suspicious, please report it to the **server management or admin team.**\n\n` +
      `Thank you – *Magic UI Team*`;

    const files = attachments.map((a) => a.url);

    try {
      await target.send({
        components: [
          v2Card({
            title: "<:166878038:1346947141570007060> You have a new message from the Magic UI Team:",
            body: dmBody,
            footer: `Sent: <t:${Math.floor(Date.now() / 1000)}:F>`,
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        files,
        allowedMentions: { parse: [] },
      });

      await message.reply({
        components: [
          v2Card({
            title: "DM Sent",
            body: `Sent a Magic UI system DM to **${target.user.tag}**.`,
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch {
      return message.reply({
        components: [
          v2Card({
            title: "DM Failed",
            body: "Could not send DM – user may have DMs disabled.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    let logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) {
      try {
        logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      } catch { }
    }
    if (!logChannel) return;

    const logBody =
      `**Moderator:** ${message.author.tag} (${message.author.id})\n` +
      `**User:** ${target.user.tag} (${target.id})\n` +
      `**Message:** ${text ? text : "*No message provided.*"}`;

    try {
      await logChannel.send({
        components: [
          v2Card({
            title: "📨 Magic UI System DM Sent",
            body: logBody,
            footer: `Logged: <t:${Math.floor(Date.now() / 1000)}:F>`,
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        files: attachments[0] ? [attachments[0].url] : undefined,
        allowedMentions: { parse: [] },
      });
    } catch { }
  },
};
