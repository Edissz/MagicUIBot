const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const { addCase, getUser } = require("../utils/caseStore");

const APPEAL_URL = "https://discord.com/channels/1151315619246002176/1405208521871724605";
const YELLOW = 0xF1C40F;

function card({ title, body, withAppeal }) {
  const c = new ContainerBuilder().setAccentColor(YELLOW);

  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const safeBody = String(body || "").trim();
  c.addTextDisplayComponents((t) => t.setContent(safeBody.length ? safeBody : " "));

  if (withAppeal) {
    c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    c.addActionRowComponents((row) =>
      row.setComponents(new ButtonBuilder().setLabel("Open Appeal").setURL(APPEAL_URL).setStyle(ButtonStyle.Link))
    );
  }

  return c;
}

module.exports = {
  name: "warn",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({
        components: [
          card({
            title: "Permission Denied",
            body: "You do not have permission to use this command.",
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
            title: "Warning Failed",
            body: "Please mention a valid user.",
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    }

    const reason = args.slice(1).join(" ").trim() || "No reason provided.";
    const caseNum = addCase(message.guild.id, target.id, {
      type: "warn",
      mod: message.author.id,
      reason,
    });

    await message.reply({
      components: [
        card({
          title: "Warning Issued",
          body: `User: **${target.user.tag}**\nCase: **#${caseNum}**\nReason: ${reason}`,
        }),
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });


    const dmBody =
      `Hi there, just a quick heads-up from the Magic UI moderation team.\n\n` +
      `> **Action:** Warning\n` +
      `> **Case ID:** #${caseNum}\n` +
      `> **Reason:** ${reason}\n\n` +
      `${whyWarned}\n\n` +
      `We also ask that you follow Discord’s Community Guidelines and keep the space respectful for everyone.\n\n` +
      `If you believe this action was taken in error, you can submit an appeal here:\n` +
      `${APPEAL_URL}\n\n` +
      `Thanks for understanding,\n` +
      `Magic UI Moderation Team`;

    try {
      await target.send({
        components: [
          card({
            title: "Moderation Notice",
            body: dmBody,
            withAppeal: true,
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch { }

    let log = client.channels.cache.get(client.modlogChannelId);
    if (!log) {
      try {
        log = await client.channels.fetch(client.modlogChannelId);
      } catch { }
    }

    if (log) {
      const logBody =
        `**Action:** Warning\n` +
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

    const info = getUser(message.guild.id, target.id);
    const warnCount = (info.cases || []).filter((c) => c.type === "warn").length;

    if (warnCount >= 3) {
      const hours = 6;
      await target.timeout(hours * 60 * 60 * 1000, "Auto-timeout: accumulated warnings").catch(() => null);

      const autoBody =
        `This is an automated notice from the Magic UI moderation system.\n\n` +
        `> **Action:** Timeout (${hours}h)\n` +
        `> **Reason:** Reached the warning threshold (3 warnings)\n\n` +
        `This timeout is meant to cool things down, not to attack you. When it ends, you’re welcome to continue participating as long as you follow the rules and Discord’s Community Guidelines.\n\n` +
        `If you believe this was applied in error, you can submit an appeal here:\n` +
        `${APPEAL_URL}\n\n` +
        `Magic UI Moderation Team`;

      try {
        await target.send({
          components: [
            card({
              title: "Moderation Notice",
              body: autoBody,
              withAppeal: true,
            }),
          ],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      } catch { }

      if (!log) {
        try {
          log = await client.channels.fetch(client.modlogChannelId);
        } catch { }
      }

      if (log) {
        await log.send({
          components: [
            card({
              title: "Automated Moderation Action",
              body: `**Action:** Timeout (${hours}h)\n**User:** ${target.user.tag} (${target.id})\n**Reason:** Reached 3 warnings\n**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`,
            }),
          ],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
      }
    }
  },
};
