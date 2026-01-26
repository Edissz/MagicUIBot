const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    await new Promise((res) => setTimeout(res, 2000));

    const title = "Hey There!";
    const body =
      `## 👋 Welcome to <:166878038:1346947141570007060> **Magic UI**\n\n` +
      `You’re in. Here’s where to start so you don’t feel lost:\n\n` +
      `**Quick links**\n` +
      ` - 📌 [Rules & FAQs](https://discord.com/channels/1151315619246002176/1151318734158446623)\n` +
      ` - ❓ [FAQs (fast answers)](https://discord.com/channels/1151315619246002176/1383896107012063333)\n` +
      ` - ✨ [New Components & Releases](https://discord.com/channels/1151315619246002176/1151315620013551751)\n` +
      ` - 🖼️ [Showcase](https://discord.com/channels/1151315619246002176/1362409572165226596)\n` +
      ` - 💬 [Talk with others](https://discord.com/channels/1151315619246002176/1151315620013551755)\n\n` +
      `**Need help?**\n` +
      `<:messagenotification01StrokeRound:1463199182541033543> Ask in [Support](https://discord.com/channels/1151315619246002176/1405208521871724605) and the team will guide you.\n\n` +
      `-# <:coffee03StrokeRounded:1463199239558533212> Enjoy your stay, and drop something you’re building in Showcase.`;

    const container = new ContainerBuilder();

    container.addTextDisplayComponents((t) => t.setContent(`**${title}**`));
    container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents((t) => t.setContent(body));
    container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    container.addActionRowComponents((row) =>
      row.setComponents(
        new ButtonBuilder().setLabel("Visit Magic UI").setURL("https://magicui.design/").setStyle(ButtonStyle.Link)
      )
    );

    try {
      await member.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
      console.log(`✅ Sent welcome DM to ${member.user.tag}`);
    } catch (err) {
      console.error(`❌ Failed to DM ${member.user.tag}:`, err?.message || err);
    }
  },
};
