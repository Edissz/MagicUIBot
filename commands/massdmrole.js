const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "massdmrole",
  description: "DM everyone in a role with rate-limit and progress.",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("❌ You don’t have permission.");

    const role = message.mentions.roles.first();
    if (!role) return message.reply("❌ Mention a role: `!massdmrole @Role [delaySeconds]`");

    const delayMs = Math.max(0, Number(args[1] || 2.5) * 1000);

    await message.guild.members.fetch();
    const targets = message.guild.members.cache.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

    const eventLink = "https://discord.com/events/1151315619246002176/1429429806189248603";
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("<:166878038:1346947141570007060> New MagicUI Template Releasing Today!")
      .setDescription("Hey there! We’re excited to announce that **Magic UI** is dropping a brand-new template **today** 🎉\n\nCheck out the full event details and updates below 👇\n\nClick **Interested** to get notified when it goes live!")
      .setFooter({ text: "MagicUI — Elevate your next project." })
      .setTimestamp();

    const total = targets.size;
    if (!total) return message.reply("⚠️ No members found with that role.");

    const progress = await message.reply(`📤 Starting • 0% — ✅ 0 ❌ 0 ⏳ ${total}`);

    let sent = 0, failed = 0, processed = 0;

    const wait = ms => new Promise(r => setTimeout(r, ms));

    for (const member of targets.values()) {
      try {
        await member.send({ embeds: [embed] });
        await member.send(`🔗 Event Link: ${eventLink}`);
        sent++;
      } catch {
        failed++;
      }
      processed++;
      const pct = Math.round((processed / total) * 100);
      await progress.edit(`📤 Progress • ${pct}% — ✅ ${sent} ❌ ${failed} ⏳ ${total}`);
      await wait(delayMs);
    }

    await progress.edit(`✅ Finished • ${Math.round((processed/total)*100)}% — ✅ ${sent}/${total} ❌ ${failed}`);
  },
};
