const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const TICKET_CATEGORY_ID = '1405640921017745419';
const MODLOGS_ID = '1355260778965373000';
const STAFF_ROLE_IDS = ['1405207645618700349', '1324536259439362089'];
const royalBlue = 0x5865f2;

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function newTicketId(userId) {
  return `T-${Date.now()}-${userId.slice(-4)}`;
}

async function writeTranscript(channel, filePath) {
  let fetched;
  let lastId;
  const lines = [];
  do {
    fetched = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!fetched || fetched.size === 0) break;
    fetched.forEach(m => {
      const ts = new Date(m.createdTimestamp).toISOString();
      const author = `${m.author.tag} (${m.author.id})`;
      const content = m.cleanContent || '';
      const attachments = m.attachments.map(a => a.url).join(' ');
      lines.push(`[${ts}] ${author}: ${content} ${attachments}`.trim());
    });
    lastId = fetched.last().id;
  } while (fetched.size === 100);

  fs.writeFileSync(filePath, lines.reverse().join('\n'), 'utf8');
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_reason') {
      const reasonVal = interaction.values[0];

      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal:${reasonVal}`)
        .setTitle('MagicUI • Ticket Details');

      const q1 = new TextInputBuilder()
        .setCustomId('issue')
        .setLabel('Issue details')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      const q2 = new TextInputBuilder()
        .setCustomId('steps')
        .setLabel('What steps have you tried?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000);

      const q3 = new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Additional notes (links, order id, etc.)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(q1),
        new ActionRowBuilder().addComponents(q2),
        new ActionRowBuilder().addComponents(q3)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal:')) {
      const reasonVal = interaction.customId.split(':')[1];
      const issue = interaction.fields.getTextInputValue('issue');
      const stepsTried = interaction.fields.getTextInputValue('steps');
      const notes = interaction.fields.getTextInputValue('notes') || 'None';

      const guild = interaction.guild;
      const me = guild.members.me;
      const ticketId = newTicketId(interaction.user.id);

      const overwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.AttachFiles] },
        ...STAFF_ROLE_IDS.map(rid => ({ id: rid, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
      ];

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: overwrites,
        reason: `Ticket ${ticketId} (${reasonVal})`
      });

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ticket_claim:${ticketId}`).setLabel('Claim').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`ticket_hold:${ticketId}`).setLabel('Hold').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket_close:${ticketId}`).setLabel('Close').setStyle(ButtonStyle.Danger)
      );

      const openEmbed = new EmbedBuilder()
        .setColor(royalBlue)
        .setTitle(`Ticket Created • ${ticketId}`)
        .setDescription(
          `Thank you for contacting **MagicUI Support**.\n\n` +
          `**Reason:** \`${reasonVal}\`\n` +
          `**Created by:** <@${interaction.user.id}>\n\n` +
          `**Issue Details**\n${issue}\n\n` +
          `**Steps Tried**\n${stepsTried}\n\n` +
          `**Additional Notes**\n${notes}`
        )
        .setFooter({ text: 'A staff member will reply shortly.' });

      await channel.send({
        content: `<@${interaction.user.id}> <@&${STAFF_ROLE_IDS[0]}> <@&${STAFF_ROLE_IDS[1]}>`,
        embeds: [openEmbed],
        components: [btnRow],
        allowedMentions: { users: [interaction.user.id], roles: STAFF_ROLE_IDS }
      });

      // staff-only private thread
      try {
        const thread = await channel.threads.create({
          name: `staff-${ticketId}`,
          autoArchiveDuration: 1440,
          type: ChannelType.PrivateThread,
          invitable: false,
        });
        for (const rid of STAFF_ROLE_IDS) {
          const role = guild.roles.cache.get(rid);
          if (role) {
            for (const m of role.members.values()) {
              await thread.members.add(m.id).catch(() => {});
            }
          }
        }
        await thread.send({ content: `Staff thread for **${ticketId}**.` });
      } catch (_) {}

      // DM link to user
      try {
        await interaction.user.send({
          content: `✅ Your ticket **${ticketId}** has been created: ${channel.toString()}`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Open Ticket').setURL(`https://discord.com/channels/${guild.id}/${channel.id}`)
            )
          ]
        });
      } catch (_) {}

      // log creation
      const logCh = client.channels.cache.get(MODLOGS_ID);
      if (logCh) {
        const logEmbed = new EmbedBuilder()
          .setColor(royalBlue)
          .setTitle('Ticket Created')
          .setDescription(`**ID:** ${ticketId}\n**User:** ${interaction.user.tag} (${interaction.user.id})\n**Reason:** ${reasonVal}\n**Channel:** ${channel}`)
          .setTimestamp();
        await logCh.send({ embeds: [logEmbed] });
      }

      return interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    }

    // Buttons
    if (interaction.isButton()) {
      const [action, ticketId] = interaction.customId.split(':');
      const channel = interaction.channel;
      const logCh = interaction.client.channels.cache.get(MODLOGS_ID);

      if (action === 'ticket_claim') {
        await interaction.deferUpdate();
        const claimedEmbed = new EmbedBuilder()
          .setColor(royalBlue)
          .setDescription(`✅ Ticket **${ticketId}** has been claimed by ${interaction.user}.`);
        await channel.send({ embeds: [claimedEmbed] });
        if (logCh) await logCh.send({ embeds: [claimedEmbed.setTitle('Ticket Claimed').setTimestamp()] });
        return;
      }

      if (action === 'ticket_hold') {
        await interaction.deferUpdate();
        const heldEmbed = new EmbedBuilder()
          .setColor(royalBlue)
          .setDescription(`⏸️ Ticket **${ticketId}** has been marked as **On Hold** by ${interaction.user}.`);
        await channel.send({ embeds: [heldEmbed] });
        if (logCh) await logCh.send({ embeds: [heldEmbed.setTitle('Ticket On Hold').setTimestamp()] });
        return;
      }

      if (action === 'ticket_close') {
        return interaction.reply({
          ephemeral: true,
          content: 'Close this ticket?',
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`ticket_close_confirm:${ticketId}`).setStyle(ButtonStyle.Danger).setLabel('Confirm Close'),
              new ButtonBuilder().setCustomId('ticket_close_cancel').setStyle(ButtonStyle.Secondary).setLabel('Cancel')
            )
          ]
        });
      }

      if (action === 'ticket_close_cancel') {
        return interaction.update({ content: '❎ Close cancelled.', components: [], ephemeral: true });
      }

      if (action === 'ticket_close_confirm') {
        await interaction.update({ content: 'Closing… generating transcript…', components: [], ephemeral: true });

        const filePath = path.join(dataDir, `transcript-${ticketId}.txt`);
        await writeTranscript(channel, filePath).catch(() => {});

        const closedEmbed = new EmbedBuilder()
          .setColor(royalBlue)
          .setTitle('Ticket Closed')
          .setDescription(`**ID:** ${ticketId}\n**Closed by:** ${interaction.user.tag} (${interaction.user.id})`)
          .setTimestamp();

        if (logCh) {
          await logCh.send({
            embeds: [closedEmbed],
            files: fs.existsSync(filePath) ? [filePath] : []
          });
        }

        const owner = channel.members.find(m => !m.user.bot && !m.roles.cache.hasAny(...STAFF_ROLE_IDS));
        if (owner) {
          try {
            await owner.send('✅ Your ticket has been closed. If you need more help, open a new ticket from the panel.');
          } catch (_) {}
        }

        return channel.delete('Ticket closed');
      }
    }
  },
};
