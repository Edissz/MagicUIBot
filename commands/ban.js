const {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField,
  SeparatorSpacingSize,
} = require("discord.js");
const { addCase } = require("../utils/caseStore");

const APPEAL_URL = "https://discord.com/channels/1151315619246002176/1405208521871724605";
const RED = 0xed4245;

function card({ title, body, buttonLabel, buttonUrl }) {
  const c = new ContainerBuilder().setAccentColor(RED);

  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const safeBody = String(body || "").trim();
  c.addTextDisplayComponents((t) => t.setContent(safeBody.length ? safeBody : " "));

  if (buttonLabel && buttonUrl) {
    c.addActionRowComponents((row) =>
      row.setComponents(
        new ButtonBuilder().setLabel(buttonLabel).setStyle(ButtonStyle.Link).setURL(buttonUrl)
      )
    );
  }

  return c;
}

module.exports = {
  name: "ban",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply({
        components: [
          card({
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
          card({
            title: "Ban Failed",
            body: "Please mention a valid user.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const reason = args.slice(1).join(" ") || "No reason provided.";
    const caseNum = addCase(message.guild.id, target.id, {
      type: "ban",
      mod: message.author.id,
      reason,
    });

    const dmBody =
      `**You received a punishment from our moderation team.**\n\n` +
      `> **Punishment:** Ban\n` +
      `> **Case ID:** #${caseNum}\n` +
      `> **Reason:** ${reason}\n\n` +
      `Appeal:\n${APPEAL_URL}\n` +
      `Magic UI Moderation Team.`;

    try {
      await target.send({
        components: [
          card({
            title: "Punishment Notice",
            body: dmBody,
            buttonLabel: "Appeal Here",
            buttonUrl: APPEAL_URL,
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch { }

    try {
      await target.ban({ reason });
    } catch {
      return message.reply({
        components: [
          card({
            title: "Ban Failed",
            body: "Failed to ban user. Possibly missing permissions.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    let log = client.channels.cache.get(client.modlogChannelId);
    if (!log) {
      try {
        log = await client.channels.fetch(client.modlogChannelId);
      } catch { }
    }

    if (log) {
      const logBody =
        `**Action:** Ban\n` +
        `**User:** ${target.user.tag} (${target.id})\n` +
        `**Moderator:** ${message.author.tag} (${message.author.id})\n` +
        `**Reason:** ${reason}\n` +
        `**Case ID:** #${caseNum}\n` +
        `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`;

      await log.send({
        components: [
          card({
            title: "Moderation Log",
            body: logBody,
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    return message.reply({
      components: [
        card({
          title: "Ban Complete",
          body: `Banned **${target.user.tag}**\nCase: **#${caseNum}**`,
        }),
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
