const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberUpdate",

  async execute(oldMember, newMember, client) {
    if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    const added = addedRoles.map(r => `• ${r.name}`).join("\n") || "None";
    const removed = removedRoles.map(r => `• ${r.name}`).join("\n") || "None";

    const dmEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🔔 Role Update Notification")
      .setDescription(
        `Your roles have been updated in **Magic UI**.\n\n` +
        `**Added Roles:**\n${added}\n\n` +
        `**Removed Roles:**\n${removed}\n\n` +
        `If you believe this change was made by mistake, please contact a staff member.`
      )
      .setFooter({ text: "Magic UI System" })
      .setTimestamp();

    try {
      await newMember.send({ embeds: [dmEmbed] });
    } catch {
      console.log(`❌ Could not DM ${newMember.user.tag}.`);
    }

    const modlogChannel = newMember.guild.channels.cache.get("1355260778965373000");
    if (modlogChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle("🧾 Role Change Log")
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**User:** ${newMember.user.tag} (${newMember.id})\n` +
          `**Added Roles:**\n${added}\n\n` +
          `**Removed Roles:**\n${removed}`
        )
        .setFooter({ text: "Magic UI Moderation Logs" })
        .setTimestamp();

      await modlogChannel.send({ embeds: [logEmbed] });
    }
  },
};
