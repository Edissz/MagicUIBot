const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const { addCase } = require("../utils/caseStore");

const APPEAL_URL = "https://discord.com/channels/1151315619246002176/1405208521871724605";
const RED = 0xed4245;

function punishmentCard({ header, lines, buttonLabel, buttonUrl }) {
  const container = new ContainerBuilder().setAccentColor(RED);

  container.addTextDisplayComponents((t) =>
    t.setContent(`**${header}**`)
  );

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  for (const line of lines) {
    container.addTextDisplayComponents((t) => t.setContent(line));
  }

  if (buttonLabel && buttonUrl) {
    container.addActionRowComponents((row) =>
      row.setComponents(
        new ButtonBuilder()
          .setLabel(buttonLabel)
          .setStyle(ButtonStyle.Link)
          .setURL(buttonUrl)
      )
    );
  }

  return container;
}

function modLogCard({ target, moderator, reason, caseNum }) {
  const container = new ContainerBuilder().setAccentColor(RED);

  container.addTextDisplayComponents((t) => t.setContent("**Moderation Log**"));

  container.addSeparatorComponents((s) =>
    s.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents(
        (t) => t.setContent(`**Action:** Ban`),
        (t) => t.setContent(`**User:** ${target.user.tag} (${target.id})`),
        (t) =>
          t.setContent(
            `**Moderator:** ${moderator.tag} (${moderator.id})\n**Reason:** ${reason}\n**Case ID:** #${caseNum}\n**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
      )
      .setThumbnailAccessory((thumb) =>
        thumb
          .setURL(target.user.displayAvatarURL({ size: 256 }))
          .setDescription(`${target.user.tag} avatar`)
      )
  );

  return container;
}

module.exports = {
  name: "ban",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      const c = punishmentCard({
        header: "Permission Denied",
        lines: ["You don’t have permission to use this command."],
      });
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    const target = message.mentions.members.first();
    if (!target) {
      const c = punishmentCard({
        header: "Ban Failed",
        lines: ["Please mention a valid user."],
      });
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    const reason = args.slice(1).join(" ") || "No reason provided.";
    const caseNum = addCase(message.guild.id, target.id, {
      type: "ban",
      mod: message.author.id,
      reason,
    });

    const dmCard = punishmentCard({
      header: "Punishment Notice",
      lines: [
        "**You received a punishment from our moderation team.**",
        "",
        `> **Punishment:** Ban`,
        `> **Case ID:** #${caseNum}`,
        `> **Reason:** ${reason}`,
        "",
        `Appeal:\n${APPEAL_URL}`,
        "Magic UI Moderation Team.",
      ],
      buttonLabel: "Appeal Here",
      buttonUrl: APPEAL_URL,
    });

    try {
      await target.send({
        components: [dmCard],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch { }

    try {
      await target.ban({ reason });
    } catch {
      const c = punishmentCard({
        header: "Ban Failed",
        lines: ["Failed to ban user. Possibly missing permissions."],
      });
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    let log = client.channels.cache.get(client.modlogChannelId);
    if (!log) {
      try {
        log = await client.channels.fetch(client.modlogChannelId);
      } catch { }
    }

    if (log) {
      const logCard = modLogCard({
        target,
        moderator: message.author,
        reason,
        caseNum,
      });

      await log.send({
        components: [logCard],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const confirmCard = punishmentCard({
      header: "Ban Complete",
      lines: [`Banned **${target.user.tag}**`, `Case: **#${caseNum}**`],
    });

    await message.reply({
      components: [confirmCard],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
