const {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { formatEtaText } = require("../utils/ticketStats");

const PANEL_COOLDOWN_MS = 30000;

const BRAND = {
  color: 0x2b79ee,
  authorName: "MagicUI Support",
  footerText: "MagicUI Support"
};

function makeEmbed({ client, guild, title, description, image }) {
  const icon =
    guild?.iconURL?.({ dynamic: true, size: 128 }) ||
    client?.user?.displayAvatarURL?.({ dynamic: true, size: 128 }) ||
    undefined;

  const e = new EmbedBuilder()
    .setColor(BRAND.color)
    .setAuthor({ name: BRAND.authorName, iconURL: icon })
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
      return message.reply("<:cross:1430525603701850165> Please wait before sending another panel.");
    }
    client.__panelCooldown.set(message.channel.id, Date.now());

    const e1 = makeEmbed({
      client,
      guild: message.guild,
      title: "Welcome to MagicUI Support",
      description:
        "Welcome to the official **MagicUI** support.\n\n" +
        "**Use the dropdown** to open a ticket.\n" +
        "**Use Contact Support** for private, staff-reviewed requests (staff may reply via DM)."
    });

    const e2 = makeEmbed({
      client,
      guild: message.guild,
      title: "Rules & What This Is For",
      description:
        "**Before you open anything:**\n" +
        "- No spam, no duplicates, no random pings\n" +
        "- Add screenshots/logs when possible\n" +
        "- Keep the issue focused and clear\n\n" +
        "**Bug reports:** use the **Bug Report (GitHub)** option in the dropdown.\n" +
        "**Technical Support:** only if it’s a technical issue (install/build/config/deploy)."
    });

    const etaEmbed = makeEmbed({
      client,
      guild: message.guild,
      title: "Estimated Claim Time",
      description: formatEtaText(client, message.guild)
    });

    const e3 = makeEmbed({
      client,
      guild: message.guild,
      title: "Open a Ticket",
      description:
        "Choose an option from the dropdown:\n" +
        "- **Technical Support** — install/build/config/deploy help\n" +
        "- **Bug Report (GitHub)** — sends you the issues link (no ticket created)\n" +
        "- **Billing & Payments** — invoices/charges/access\n" +
        "- **Account & Access** — roles/auth/permissions\n" +
        "- **Voice Support** — creates a voice channel + ticket"
    });

    const e4 = makeEmbed({
      client,
      guild: message.guild,
      title: "Contact Support (Private Request)",
      description:
        "Press the button below and fill out the form:\n" +
        "• What issue you’re experiencing\n" +
        "• What you tried already\n" +
        "• Whether you’re on **Free** or **Pro**\n" +
        "• Optional email (only if you want contact outside Discord)\n\n" +
        "After you submit, staff will review it and reply when possible.",
      image: "https://cdn.discordapp.com/attachments/1355260778965373000/1421110900508721182/Here_to_Help..gif"
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_reason_select")
        .setPlaceholder("Choose a ticket type…")
        .addOptions(
          {
            label: "Technical Support",
            value: "technical_support",
            description: "Install/build/config/deploy help"
          },
          {
            label: "Bug Report (GitHub)",
            value: "bug_report",
            description: "Opens GitHub issues link (no ticket created)"
          },
          {
            label: "Billing & Payments",
            value: "billing",
            description: "Invoices, charges, refunds, access issues"
          },
          {
            label: "Account & Access",
            value: "account_access",
            description: "Roles, auth, permissions, Pro access"
          },
          {
            label: "Voice Support",
            value: "voice",
            description: "Creates a voice channel + ticket"
          }
        )
    );

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("support_contact")
        .setLabel("Contact Support")
        .setStyle(ButtonStyle.Primary)
        .setEmoji({ id: "1463540942870155327", name: "sent02StrokeRounded" })
    );

    const panelMsg = await message.channel.send({
      embeds: [e1, e2, etaEmbed, e3, e4],
      components: [selectRow, buttonRow]
    });

    if (!client.ticketPanelInfo) client.ticketPanelInfo = {};
    client.ticketPanelInfo[message.guild.id] = {
      channelId: panelMsg.channel.id,
      messageId: panelMsg.id
    };

    return message.reply("<:check:1430525546608988203> Ticket panel posted.");
  }
};
