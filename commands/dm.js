const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "dm",
  description: "Send a system-styled Magic UI DM to a user.",
  async execute(message, args, client) {
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You don’t have permission to use this command.");

    const target = message.mentions.members.first();
    if (!target) return message.reply("❌ Please mention a user to DM.");

    const text = args.slice(1).join(" ");
    const attachments = Array.from(message.attachments.values());
    if (!text && attachments.length === 0)
      return message.reply("❌ Please provide a message or attach a file.");

    // Build the embed styled like your example
    const embed = new EmbedBuilder()
      .setColor("#23232A") // dark background color
      .setTitle("<:166878038:1346947141570007060> You have a new message from the Magic UI Team:")
      .setDescription(
        `**Message:** ${text || "*No message provided.*"}\n\n` +
        "If you believe this message was sent in error or seems suspicious, " +
        "please report it to the **server management or admin team.**\n\n" +
        "Thank you – *Magic UI Team*"
      )
      .setThumbnail("https://magicui.design/icon.png") // your logo
      .setTimestamp()
      .setFooter({ text: "Magic UI Team", iconURL: "https://magicui.design/icon.png" });

    try {
      await target.send({
        embeds: [embed],
        files: attachments.map(a => a.url)
      });

      await message.reply(`✅ Sent a Magic UI system DM to **${target.user.tag}**.`);
    } catch {
      return message.reply("❌ Could not send DM – user may have DMs disabled.");
    }

    // Log the action
    const logChannel = client.channels.cache.get("1355260778965373000");
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📨 Magic UI System DM Sent")
        .setDescription(
          `**Moderator:** ${message.author.tag} (${message.author.id})\n` +
          `**User:** ${target.user.tag} (${target.id})\n` +
          `**Message:** ${text || "*No message provided.*"}`
        )
        .setFooter({ text: "Magic UI Moderation System" })
        .setTimestamp();

      if (attachments[0]) logEmbed.setImage(attachments[0].url);

      await logChannel.send({ embeds: [logEmbed] });
    }
  },
};