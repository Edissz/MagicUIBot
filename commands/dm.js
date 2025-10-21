const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "dm",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You don’t have permission to use this command.");

    const target = message.mentions.members.first();
    if (!target) return message.reply("❌ Please mention a user to DM.");
    const text = args.slice(1).join(" ");
    if (!text && message.attachments.size === 0)
      return message.reply("❌ Please provide a message or attach a file.");

    const attachmentArray = Array.from(message.attachments.values());

    
    const payload = {
      flags: 1 << 15,
      components: [
        {
          type: 17, 
          accent_color: 0x2b2d31, 
          components: [
            {
              type: 9, 
              components: [
                {
                  type: 10, 
                  content:
                    "📨 **You have a new message from the Magic UI Team:**\n\n" +
                    `**Message:** ${text || "*No message provided.*"}\n\n` +
                    "If you believe this message was sent in error or seems suspicious, " +
                    "please report it to the **server management or admin team.**\n\n" +
                    "Thank you – *Magic UI Team*",
                },
              ],
              accessory: {
                type: 11, // Thumbnail
                media: { url: "https://magicui.design/icon.png" }, 
                description: "Magic UI Logo",
              },
            },
          ],
        },
      ],
    };

    // add attachments as media
    if (attachmentArray.length > 0) {
      payload.components.push({
        type: 12, // Media Gallery
        items: attachmentArray.map((a) => ({
          media: { url: a.url },
          description: a.name,
        })),
      });
    }

   
    try {
      await target.send(payload);
      await message.reply(`✅ Sent a system DM to **${target.user.tag}**`);
    } catch {
      return message.reply("❌ Could not send DM – user may have DMs off.");
    }

    //  Log to modlogs
    const log = client.channels.cache.get("1355260778965373000");
    if (log) {
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📨 System DM Sent via Magic UI Bot")
        .setDescription(
          `**Moderator:** ${message.author.tag} (${message.author.id})\n` +
            `**User:** ${target.user.tag} (${target.id})\n` +
            `**Message:** ${text || "*No message provided.*"}`
        )
        .setTimestamp()
        .setFooter({ text: "Magic UI Moderation System" });

      if (attachmentArray[0]) embed.setImage(attachmentArray[0].url);
      await log.send({ embeds: [embed] });
    }
  },
};
