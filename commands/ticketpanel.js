const {
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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
        "<:techouse211:1421840900258009129> Welcome to the **official Magic UI support**. We’re here to help with design, code, billing, access, and technical issues.\n\nPlease pick the correct reason to avoid delays.",
    });

    const e2 = v2Embed({
      title: "Rules & When to Open a Ticket",
      description:
        "**Please Read Before Opening a Ticket**\n\nMisuse of the ticket system may result in warnings.\n\n" +
        "**<:techouse210:1421840914653122631> Tickets may be opened for:**\n" +
        "* <:techouse212:1421842840899551332> Payment or billing issues\n" +
        "* <:techouse213:1421844306511007784> Bug reports or broken components\n" +
        "* <:techouse214:1421844303474462720> General support inquiries\n" +
        "* <:techouse215:1421844300043387050> Rule violation reports\n" +
        "* <:techouse216:1421844296537083994> Order or product issues\n\n" +
        "**Do *not* open tickets for:**\n" +
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
      title: "Open a Ticket",
      description:
        "Select the reason below. Next, you’ll enter a short summary + details in a form, then your ticket channel will be created.",
      image:
        "https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif",
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_reason_select")
      .setPlaceholder("Choose a reason")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Payment Issue")
          .setDescription("Billing, refunds, failed transactions.")
          .setValue("billing")
          .setEmoji({ id: "1421842840899551332", name: "techouse212" }),
        new StringSelectMenuOptionBuilder()
          .setLabel("Bug Report & Technical Support")
          .setDescription("Broken components, errors, glitches.")
          .setValue("bug")
          .setEmoji({ id: "1421844306511007784", name: "techouse213" }),
        new StringSelectMenuOptionBuilder()
          .setLabel("General Support")
          .setDescription("Questions not listed above.")
          .setValue("general")
          .setEmoji({ id: "1421844303474462720", name: "techouse214" }),
        new StringSelectMenuOptionBuilder()
          .setLabel("Rule Violation")
          .setDescription("Report users or rule-breaking content.")
          .setValue("rule")
          .setEmoji({ id: "1421844300043387050", name: "techouse215" }),
        new StringSelectMenuOptionBuilder()
          .setLabel("Order / Product Issue")
          .setDescription("Purchase, delivery, or product problems.")
          .setValue("order")
          .setEmoji({ id: "1421844296537083994", name: "techouse216" }),
        new StringSelectMenuOptionBuilder()
          .setLabel("Live Voice Meeting With Support")
          .setDescription("Private voice support (screen share allowed).")
          .setValue("voice")
          .setEmoji("🎧")
      );

    const row = new ActionRowBuilder().addComponents(menu);

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
