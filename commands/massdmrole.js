const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "massdmrole",
  description: "DM everyone in a specific role about the MagicUI event.",
  async execute(message, args) {
    if (!message.member.permissions.has("Administrator"))
      return message.reply("❌ You don’t have permission to use this.");

    const role = message.mentions.roles.first();
    if (!role) return message.reply("❌ Mention a role to DM (e.g. `!massdmrole @Role`).");

    const members = role.members;
    if (!members.size) return message.reply("⚠️ No members found with that role.");

    const eventLink = "https://discord.com/events/1151315619246002176/1429429806189248603";
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("<:166878038:1346947141570007060> New MagicUI Template Releasing Today!")
      .setDescription(
        "Hey there! We’re excited to announce that **Magic UI** is dropping a brand-new template **today** 🎉\n\nCheck out the full event details and updates below 👇\n\nClick **Interested** to get notified when it goes live!"
      )
      .setFooter({ text: "MagicUI — Elevate your next project." })
      .setTimestamp();

    let success = 0;
    for (const [_, member] of members) {
      try {
        await member.send({ embeds: [embed] });
        await member.send(`🔗 Event Link: ${eventLink}`);
        success++;
        await new Promise(r => setTimeout(r, 1000)); // wait 1s per DM to avoid rate limits
      } catch (err) {
        console.log(`❌ Failed to DM ${member.user.tag}`);
      }
    }

    message.reply(`✅ Successfully DMed **${success}** members with the ${role.name} role.`);
  },
};
