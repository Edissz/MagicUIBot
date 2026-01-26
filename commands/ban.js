const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField,
  SeparatorSpacingSize,
} = require("discord.js");
const { addCase } = require("../utils/caseStore");

const RED = 0xed4245;

function card({ title, body, buttonLabel, buttonUrl }) {
  const c = new ContainerBuilder().setAccentColor(RED);

  c.addTextDisplayComponents((t) => t.setContent(`**${String(title || "").trim()}**`));
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

function escapeMd(input) {
  return String(input ?? "").replace(/([\\`*_~|>])/g, "\\$1");
}

function banDmBody({ guildName, caseNum, reason, modTag, dateUnix }) {
  const safeGuild = escapeMd(guildName || "this server");
  const safeReason = escapeMd(reason || "No reason provided.");

  return (
    `You have been **banned** from **${safeGuild}**.\n\n` +
    `> **Action:** Ban\n` +
    `> **Case ID:** #${caseNum}\n` +
    `> **Reason:** ${safeReason}\n` +
    `> **Issued by:** ${escapeMd(modTag)}\n` +
    `> **Date:** <t:${dateUnix}:F>\n\n` +
    `### Why bans happen\n` +
    `This server follows Discord Community Guidelines and Magic UI policies. A ban may occur for any of the following:\n\n` +
    `**Conduct**\n` +
    `- Hate speech, harassment, discrimination, threats, or targeted abuse\n` +
    `- Trolling, baiting, toxic behavior, or starting/dragging drama\n` +
    `- Spamming, flooding, mass mentions, repeated disruptions\n` +
    `- Ignoring moderator instructions or arguing moderation decisions\n` +
    `- Misusing channels or repeatedly going off-topic\n\n` +
    `**Content standards**\n` +
    `- Posting NSFW, offensive, violent, or unsafe content\n` +
    `- Sharing misleading content, impersonation, or false claims\n` +
    `- Failing to credit creators or misrepresenting AI-assisted work\n\n` +
    `**Originality & licensing**\n` +
    `- Plagiarism or copying designs/code/assets without permission\n` +
    `- Violating software/content licenses or removing required attribution\n\n` +
    `**Promotion & advertising**\n` +
    `- Posting invite/referral/affiliate links\n` +
    `- Unapproved paid promotions\n` +
    `- Unsolicited advertising or private promotions (including DMs)\n\n` +
    `**Privacy & safety**\n` +
    `- Sharing personal/private/sensitive information\n` +
    `- Phishing, scams, malware, or malicious/unsafe links\n` +
    `- Attempts to compromise accounts, services, or security\n\n` +
    `### Appeal status\n` +
    `Appeals are **not available** for this ban.\n` +
    `Do not attempt to bypass this action using alternate accounts or by contacting staff privately.\n\n` +
    `Magic UI Moderation Team`
  );
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

    const reason = args.slice(1).join(" ").trim() || "No reason provided.";
    const nowUnix = Math.floor(Date.now() / 1000);

    let caseNum;
    try {
      caseNum = addCase(message.guild.id, target.id, {
        type: "ban",
        mod: message.author.id,
        reason,
      });
    } catch {
      return message.reply({
        components: [
          card({
            title: "Ban Failed",
            body: "Could not create a case entry. Please try again.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const dmBody = banDmBody({
      guildName: message.guild?.name,
      caseNum,
      reason,
      modTag: message.author?.tag || "a moderator",
      dateUnix: nowUnix,
    });

    try {
      await target.send({
        components: [
          card({
            title: "Ban Notice",
            body: dmBody,
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
            body: "Failed to ban user. I may be missing permissions, or the user has a higher role.",
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
        `**Date:** <t:${nowUnix}:F>`;

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
