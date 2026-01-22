// commands/ticketpanel.js
const {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { formatEtaText } = require("../utils/ticketStats");

const PANEL_COOLDOWN_MS = 30000;

const BRAND = {
  color: 0xffffff,
  authorName: "MagicUI Support",
  authorIcon:
    "https://cdn.discordapp.com/icons/000000000000000000/000000000000000000.png?size=128",
  footerText: "MagicUI Support",
};

function v2Embed({ title, description, image }) {
  const e = new EmbedBuilder()
    .setColor(BRAND.color)
    .setAuthor({ name: BRAND.authorName, iconURL: BRAND.authorIcon })
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: BRAND.footerText })
    .setTimestamp();

  if (image) e.setImage(image);
  return e;
}

module.exports = {
  name: "ticketpanel",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply("<:cross:1430525603701850165> You lack permission.");
    }

    if (!client.__panelCooldown) client.__panelCooldown = new Map();
    const last = client.__panelCooldown.get(message.channel.id) || 0;
    if (Date.now() - last < PANEL_COOLDOWN_MS) {
      return message.reply(
        "<:cross:1430525603701850165> Please wait before sending another panel."
      );
    }
    client.__panelCooldown.set(message.channel.id, Date.now());

    const e1 = v2Embed({
      title: "Welcome to MagicUI Support",
      description:
        "<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**. We’re here to help with design, code, billing, access, and technical issues.\n\nClick **Contact Support** to submit your request. Our team will respond via DM when possible.",
    });

    const e2 = v2Embed({
      title: "Rules & When to Contact Support",
      description:
        "**Please Read Before Contacting Support**\n\nMisuse of the support system may result in warnings.\n\n" +
        "**<:techouse210:1421840914653122631> Use this for:**\n" +
        "* <:techouse212:1421842840899551332> Payment or billing issues\n" +
        "* <:techouse213:1421844306511007784> Bug reports or broken components\n" +
        "* <:techouse214:1421844303474462720> General support inquiries\n" +
        "* <:techouse215:1421844300043387050> Rule violation reports\n" +
        "* <:techouse216:1421844296537083994> Order or product issues\n\n" +
        "**Do *not* contact support for:**\n" +
        "> • Spam or off-topic questions\n" +
        "> • Repeated requests without new information\n" +
        "> • Feature suggestions (use <#1237846965342175394> instead)\n\n" +
        "You must follow our server rules to use this system.",
    });

    const etaEmbed = v2Embed({
      title: "Estimated Response Time",
      description: formatEtaText(client, message.guild),
    });

    const e3 = v2Embed({
      title: "Contact Support",
      description:
        "Press the button below and fill out the form:\n" +
        "• What issue you’re experiencing\n" +
        "• What you tried already\n" +
        "• Whether you’re on **Free** or **Pro**\n" +
        "• Optional email (only if you want us to contact you outside Discord)\n\n" +
        "After you submit, staff will review it in a staff-only queue and respond when possible.",
      image:
        "https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif",
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support_contact")
        .setLabel("Contact Support")
        .setStyle(ButtonStyle.Primary)
        .setEmoji({ id: "1463540942870155327", name: "sent02StrokeRounded" })
    );

    const panelMsg = await message.channel.send({
      embeds: [e1, e2, etaEmbed, e3],
      components: [row],
    });

    if (!client.ticketPanelInfo) client.ticketPanelInfo = {};
    client.ticketPanelInfo[message.guild.id] = {
      channelId: panelMsg.channel.id,
      messageId: panelMsg.id,
    };

    return message.reply("<:check:1430525546608988203> Ticket panel posted.");
  },
};
