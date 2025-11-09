const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "dm",
  description: "DM a user with the MagicUI event embed.",
  async execute(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Mention a user to DM them.");

    const eventLink = "https://discord.com/events/1151315619246002176/1429429806189248603";

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("<:166878038:1346947141570007060> New MagicUI Template Releasing Today!")
      .setDescription(
        "Hey there! We’re excited to announce that **Magic UI** is dropping a brand-new template **today** 🎉\n\nCheck out the full event details and updates below 👇\n\nClick **Interested** to get notified when it goes live!"
      )
      .setFooter({ text: "MagicUI — Elevate your next project." })
      .setTimestamp();

    try {
      await target.send({ embeds: [embed] });
      await target.send(`Event Link: ${eventLink}`);
      await message.reply(`✅ DM sent to ${target.tag}`);
    } catch (err) {
      console.error(err);
      await message.reply("⚠️ Couldn't send the DM. The user might have DMs off.");
    }
  },
};
