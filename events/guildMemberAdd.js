const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    // Small delay to ensure the bot can DM right after join
    await new Promise(res => setTimeout(res, 2000));

    try {
      const embed = new EmbedBuilder()
        .setTitle('Hey There!')
        .setDescription(`
## 👋 Welcome to <:166878038:1346947141570007060> **Magic UI!**

**Start exploring with these key channels:**
 - [Rules & Faqs](https://discord.com/channels/1151315619246002176/1151318734158446623)
 - [FAQs](https://discord.com/channels/1151315619246002176/1383896107012063333)
 - [New Components & Releases](https://discord.com/channels/1151315619246002176/1151315620013551751)
 - [Showcase](https://discord.com/channels/1151315619246002176/1362409572165226596)
 - [Talk with others](https://discord.com/channels/1151315619246002176/1151315620013551755)

**<:messagenotification01StrokeRound:1463199182541033543> Need help?**
Jump to our [Support Channel](https://discord.com/channels/1151315619246002176/1405208521871724605)

-# <:coffee03StrokeRounded:1463199239558533212> Enjoy your stay!
        `)
        .setColor('#FFFFFF')
        .setImage('https://magicui.design/og')
        .setFooter({ text: 'Magic UI - Modern Next.js Templates' });

      const button = new ButtonBuilder()
        .setLabel('Visit Magic UI')
        .setURL('https://magicui.design/')
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(button);

      await member.send({ embeds: [embed], components: [row] });
      console.log(`✅ Sent welcome DM to ${member.user.tag}`);
    } catch (err) {
      console.error(`❌ Failed to DM ${member.user.tag}:`, err.message);
    }
  },
};