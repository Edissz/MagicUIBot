const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "massdmrole",
  description: "Safely DM everyone in a specific role about the MagicUI event.",
  async execute(message, args) {
    if (!message.member.permissions.has("Administrator"))
      return message.reply("❌ You don’t have permission to use this command.");

    const role = message.mentions.roles.first();
    if (!role) return message.reply("❌ Mention a role (e.g. `!massdmrole @Notify`).");

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

    let sent = 0;
    let failed = 0;
    const total = members.size;
    const delay = 2500; // 2.5 seconds between DMs to stay safe

    const progressMsg = await message.reply(
      `📤 Starting to DM **${total}** members with the ${role.name} role... (0%)`
    );

    for (const [_, member] of members) {
      try {
        await member.send({ embeds: [embed] });
        await member.send(`🔗 Event Link: ${eventLink}`);
        sent++;
      } catch {
        failed++;
      }

      const percent = Math.round(((sent + failed) / total) * 100);
      await progressMsg.edit(
        `📤 DM Progress: **${percent}%** — ✅ Sent: **${sent}**, ❌ Failed: **${failed}**, ⏳ Total: **${total}**`
      );

      await new Promise((r) => setTimeout(r, delay));
    }

    await progressMsg.edit(
      `✅ Finished! Successfully DMed **${sent}/${total}** members (${failed} failed).`
    );
  },
};
