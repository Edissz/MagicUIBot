const {
  ContainerBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

const LOG_CHANNEL_ID = "1355260778965373000";
const ACCENT = 0x5865f2;

function card({ title, body, accent }) {
  const c = new ContainerBuilder();
  if (accent) c.setAccentColor(accent);

  c.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
  c.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  const safeBody = String(body || "").trim();
  c.addTextDisplayComponents((t) => t.setContent(safeBody.length ? safeBody : " "));

  return c;
}

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember) {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

    const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

    if (addedRoles.size === 0 && removedRoles.size === 0) return;

    const added = addedRoles.size ? addedRoles.map((r) => `• ${r.name}`).join("\n") : "None";
    const removed = removedRoles.size ? removedRoles.map((r) => `• ${r.name}`).join("\n") : "None";

    const dmBody =
      `Hi!\n\n` +
      `Your roles were updated in **Magic UI**.\n\n` +
      `**Added:**\n${added}\n\n` +
      `**Removed:**\n${removed}\n\n` +
      `If you think this was a mistake, please contact a staff member in the server.`;

    try {
      await newMember.send({
        components: [
          card({
            title: "Role Update",
            body: dmBody,
            accent: ACCENT,
          }),
        ],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch {
      console.log(`❌ Could not DM ${newMember.user.tag}.`);
    }

    let modlogChannel = newMember.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!modlogChannel) {
      try {
        modlogChannel = await newMember.guild.channels.fetch(LOG_CHANNEL_ID);
      } catch { }
    }
    if (!modlogChannel) return;

    const logBody =
      `**User:** ${newMember.user.tag} (${newMember.id})\n\n` +
      `**Added:**\n${added}\n\n` +
      `**Removed:**\n${removed}\n\n` +
      `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`;

    await modlogChannel.send({
      components: [
        card({
          title: "🧾 Role Change Log",
          body: logBody,
          accent: 0x2b2d31,
        }),
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
  },
};
