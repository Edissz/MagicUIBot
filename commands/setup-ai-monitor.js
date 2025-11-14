import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType
} from 'discord.js';
import { readConfig, writeConfig } from '../utils/store.js';
import { isAdmin } from '../utils/perm.js';
import { colors } from '../utils/colors.js';
import {
  AI_TOPICS,
  AI_ACTIONS,
  defaultAIMonitorConfig,
  buildNoticeEmbed,
  ensureOrUseNoticeChannel
} from '../utils/aimonitor.js';

const BANNER = 'https://cdn.discordapp.com/attachments/1434903737352192245/1437119867873529978/Blue_White_Gradient_Modern_Professional_Business_General_LinkedIn_Banner_8.png';

function introEmbeds() {
  const e1 = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('RVO AI Monitor <:v9:1436068886653964318>')
    .setImage(BANNER)
    .setDescription([
      '> **AI RVO Monitor** keeps your server safe and professional.',
      '',
      'Once activated, it **analyzes messages** in selected channels using advanced filters.',
      'You define how it reacts when it detects a potential violation, from alerts to automatic actions.',
      '',
      '<:v3:1435691439345635499> **Customize topics:** toxicity, spam, hate speech, NSFW, off-topic, scam.',
      '<:0v2:1435691438171095232> **Tune strictness** to fit your vibe.',
      '',
      '**Note:** It scans **text only** (no images, links, or files).',
      'This feature is in **Beta** and will improve over time.'
    ].join('\n'))
    .setFooter({ text: 'Click Next to continue setup.' });

  const e2 = new EmbedBuilder()
    .setColor(colors.secondary)
    .setTitle('Configure AI Rules & Behavior <:v5:1435691461826969620>')
    .setDescription([
      '> Set how RVO AI Monitor works on your server:',
      '',
      '• **Select Channels** to scan',
      '• **Set Violations** and what counts as a rule break',
      '• **Choose AI Response** (log, warn, delete, timeout, kick, ban)',
      '• **Transparency**: choose a public channel for the AI notice',
      '',
      '_Reminder: AI cannot access external links or attachments; only plain text is analyzed._'
    ].join('\n'));

  return [e1, e2];
}

function rowsIntro() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_next_1').setLabel('Next').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('aiwiz_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function rowsChannels(state) {
  return [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('aiwiz_channels_scan')
        .setPlaceholder('Select channels to scan')
        .setMinValues(1)
        .setMaxValues(25)
        .addChannelTypes(
          0, 5, 10, 11, 12, 15
        )
    ),
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('aiwiz_channel_notice')
        .setPlaceholder(state.noticeChannelId ? 'Notice channel selected' : 'Select a public channel for the AI notice (optional)')
        .setMinValues(0)
        .setMaxValues(1)
        .addChannelTypes(0)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_back_2').setLabel('Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('aiwiz_next_2').setLabel('Next').setStyle(ButtonStyle.Primary)
    )
  ];
}

function embedChannels(state) {
  return new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('Step 1 • Channels')
    .setDescription('Choose where the AI should scan messages and where to post the public AI notice.')
    .addFields(
      { name: 'Scanning Channels', value: state.channels.length ? state.channels.map(id => `<#${id}>`).join(' ') : '_None selected_', inline: false },
      { name: 'Notice Channel', value: state.noticeChannelId ? `<#${state.noticeChannelId}>` : '_Not set (will auto-create)_', inline: false }
    );
}

function rowsTopics(state) {
  const topicOptions = AI_TOPICS.map(t => ({ label: t.label, value: t.id }));
  const strict = ['1','2','3','4','5'];
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('aiwiz_topics')
        .setPlaceholder('Select topics to monitor')
        .setMinValues(1)
        .setMaxValues(topicOptions.length)
        .setOptions(topicOptions)
        .setDefaultValues(state.topics)
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('aiwiz_strict')
        .setPlaceholder('Strictness (1=chill, 5=strict)')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(strict.map(s => ({ label: `Level ${s}`, value: s })))
        .setDefaultValues([String(state.strictness)])
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_back_3').setLabel('Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('aiwiz_next_3').setLabel('Next').setStyle(ButtonStyle.Primary)
    )
  ];
}

function embedTopics(state) {
  return new EmbedBuilder()
    .setColor(colors.secondary)
    .setTitle('Step 2 • Topics & Strictness')
    .addFields(
      { name: 'Topics', value: state.topics.length ? state.topics.map(t => `\`${t}\``).join(', ') : '_None_', inline: false },
      { name: 'Strictness', value: `${state.strictness}/5`, inline: true }
    );
}

function rowsActions(state) {
  const actionOptions = AI_ACTIONS.map(a => ({ label: a.label, value: a.id }));
  const rows = [];
  for (const t of AI_TOPICS) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`aiwiz_action_${t.id}`)
          .setPlaceholder(`${t.label}: choose action`)
          .setMinValues(1)
          .setMaxValues(1)
          .setOptions(actionOptions)
          .setDefaultValues([state.actions[t.id] || 'log'])
      )
    );
  }
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_back_4').setLabel('Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('aiwiz_next_4').setLabel('Next').setStyle(ButtonStyle.Primary)
    )
  );
  return rows;
}

function embedActions(state) {
  return new EmbedBuilder()
    .setColor(colors.accent)
    .setTitle('Step 3 • Per-Topic Actions')
    .setDescription('Choose what the AI should do when it flags a message.')
    .addFields(
      ...AI_TOPICS.map(t => ({
        name: t.label,
        value: `\`${state.actions[t.id] || 'log'}\``,
        inline: true
      }))
    );
}

function rowsRoles(state) {
  return [
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('aiwiz_roles_admin')
        .setPlaceholder('Admin/Manager roles (can manage AI)')
        .setMinValues(0)
        .setMaxValues(10)
    ),
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('aiwiz_roles_protected')
        .setPlaceholder('Protected roles (cannot be moderated)')
        .setMinValues(0)
        .setMaxValues(10)
    ),
    new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('aiwiz_roles_exempt')
        .setPlaceholder('Exempt roles (messages not scanned)')
        .setMinValues(0)
        .setMaxValues(10)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_back_5').setLabel('Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('aiwiz_next_5').setLabel('Next').setStyle(ButtonStyle.Primary)
    )
  ];
}

function embedRoles(state) {
  return new EmbedBuilder()
    .setColor(colors.neutral)
    .setTitle('Step 4 • Roles & Exceptions')
    .addFields(
      { name: 'Admin/Managers', value: state.adminRoles.length ? state.adminRoles.map(id => `<@&${id}>`).join(' ') : '_None_', inline: false },
      { name: 'Protected Roles', value: state.protectedRoles.length ? state.protectedRoles.map(id => `<@&${id}>`).join(' ') : '_None_', inline: false },
      { name: 'Exempt Roles', value: state.exemptRoles.length ? state.exemptRoles.map(id => `<@&${id}>`).join(' ') : '_None_', inline: false }
    );
}

function rowsRules() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_rules_open').setLabel('Add / Edit Custom Rules').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_back_6').setLabel('Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('aiwiz_next_6').setLabel('Next').setStyle(ButtonStyle.Primary)
    )
  ];
}

function embedRules(state) {
  return new EmbedBuilder()
    .setColor(colors.info)
    .setTitle('Step 5 • Custom Rules')
    .setDescription(
      state.customRules?.trim()
        ? (state.customRules.length > 800 ? `${state.customRules.slice(0, 800)}…` : state.customRules)
        : '_No custom rule text provided yet._'
    );
}

function rowsConfirm() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('aiwiz_back_7').setLabel('Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('aiwiz_save').setLabel('Save Setup').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('aiwiz_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    )
  ];
}

function embedSummary(state) {
  return new EmbedBuilder()
    .setColor(colors.success)
    .setTitle('<:v6:1435697974431977522> Review & Save')
    .addFields(
      { name: 'Channels', value: state.channels.length ? state.channels.map(id => `<#${id}>`).join(' ') : '_None_', inline: false },
      { name: 'Notice Channel', value: state.noticeChannelId ? `<#${state.noticeChannelId}>` : '_Auto-create_', inline: false },
      { name: 'Topics', value: state.topics.map(t => `\`${t}\``).join(', '), inline: false },
      { name: 'Strictness', value: `${state.strictness}/5`, inline: true },
      { name: 'Actions', value: AI_TOPICS.map(t => `**${t.label}:** \`${state.actions[t.id]}\``).join('\n'), inline: false },
      { name: 'Admin/Managers', value: state.adminRoles.length ? state.adminRoles.map(id => `<@&${id}>`).join(' ') : '_None_', inline: false },
      { name: 'Protected', value: state.protectedRoles.length ? state.protectedRoles.map(id => `<@&${id}>`).join(' ') : '_None_', inline: false },
      { name: 'Exempt', value: state.exemptRoles.length ? state.exemptRoles.map(id => `<@&${id}>`).join(' ') : '_None_', inline: false },
      { name: 'Custom Rules', value: state.customRules?.trim() ? (state.customRules.length > 256 ? `${state.customRules.slice(0, 256)}…` : state.customRules) : '_None_', inline: false }
    );
}

export default {
  data: new SlashCommandBuilder()
    .setName('setup-ai-monitor')
    .setDescription('Owner/Managers: configure the RVO AI message monitor.')
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: '<:v7:1435698081399308420> Use in a server.', ephemeral: true });
    const cfg = readConfig(interaction.guildId) || {};
    if (!isAdmin(interaction.member, cfg)) return interaction.reply({ content: '<:v7:1435698081399308420> You do not have permission.', ephemeral: true });

    const state = Object.assign(
      defaultAIMonitorConfig(),
      cfg.aimonitor || {}
    );
    state.lastUpdatedBy = interaction.user.id;

    const first = await interaction.reply({
      embeds: introEmbeds(),
      components: rowsIntro(),
      ephemeral: true
    });

    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 15 * 60 * 1000, componentType: ComponentType.Button });

    let step = 0;

    async function show(stepIndex) {
      if (stepIndex === 1) {
        await interaction.editReply({
          embeds: [embedChannels(state)],
          components: rowsChannels(state)
        });
      }
      if (stepIndex === 2) {
        await interaction.editReply({
          embeds: [embedTopics(state)],
          components: rowsTopics(state)
        });
      }
      if (stepIndex === 3) {
        await interaction.editReply({
          embeds: [embedActions(state)],
          components: rowsActions(state)
        });
      }
      if (stepIndex === 4) {
        await interaction.editReply({
          embeds: [embedRoles(state)],
          components: rowsRoles(state)
        });
      }
      if (stepIndex === 5) {
        await interaction.editReply({
          embeds: [embedRules(state)],
          components: rowsRules()
        });
      }
      if (stepIndex === 6) {
        await interaction.editReply({
          embeds: [embedSummary(state)],
          components: rowsConfirm()
        });
      }
    }

    const allCollector = msg.createMessageComponentCollector({ time: 15 * 60 * 1000 });

    allCollector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: 'Only the command author can use this setup.', ephemeral: true });

      if (i.isButton()) {
        if (i.customId === 'aiwiz_next_1') { step = 1; await i.deferUpdate(); await show(1); return; }
        if (i.customId === 'aiwiz_back_2') { step = 0; await i.deferUpdate(); await interaction.editReply({ embeds: introEmbeds(), components: rowsIntro() }); return; }
        if (i.customId === 'aiwiz_next_2') { step = 2; await i.deferUpdate(); await show(2); return; }
        if (i.customId === 'aiwiz_back_3') { step = 1; await i.deferUpdate(); await show(1); return; }
        if (i.customId === 'aiwiz_next_3') { step = 3; await i.deferUpdate(); await show(3); return; }
        if (i.customId === 'aiwiz_back_4') { step = 2; await i.deferUpdate(); await show(2); return; }
        if (i.customId === 'aiwiz_next_4') { step = 4; await i.deferUpdate(); await show(4); return; }
        if (i.customId === 'aiwiz_back_5') { step = 3; await i.deferUpdate(); await show(3); return; }
        if (i.customId === 'aiwiz_next_5') { step = 5; await i.deferUpdate(); await show(5); return; }
        if (i.customId === 'aiwiz_rules_open') {
          const modal = new ModalBuilder()
            .setCustomId('aiwiz_rules_modal')
            .setTitle('Custom Rules / Guidelines');
          const ti = new TextInputBuilder()
            .setCustomId('aiwiz_rules_text')
            .setLabel('Write your rules / examples (multi-line)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(3000)
            .setPlaceholder('Example: No hate speech. No NSFW. Off-topic will be asked to move. Provide examples…');
          modal.addComponents(new ActionRowBuilder().addComponents(ti));
          await i.showModal(modal);
          return;
        }
        if (i.customId === 'aiwiz_back_6') { step = 4; await i.deferUpdate(); await show(4); return; }
        if (i.customId === 'aiwiz_next_6') { step = 6; await i.deferUpdate(); await show(6); return; }
        if (i.customId === 'aiwiz_cancel') {
          await i.update({ content: 'Setup cancelled.', embeds: [], components: [] });
          allCollector.stop('cancel');
          return;
        }
        if (i.customId === 'aiwiz_back_7') { step = 5; await i.deferUpdate(); await show(5); return; }
        if (i.customId === 'aiwiz_save') {
          await i.deferUpdate();
          const toSave = {
            enabled: true,
            channels: state.channels,
            topics: state.topics,
            strictness: state.strictness,
            actions: state.actions,
            noticeChannelId: state.noticeChannelId || null,
            customRules: state.customRules || '',
            exemptRoles: state.exemptRoles,
            protectedRoles: state.protectedRoles,
            adminRoles: state.adminRoles,
            lastUpdatedBy: state.lastUpdatedBy,
            lastUpdatedAt: Date.now()
          };
          const guild = interaction.guild;
          const ch = await ensureOrUseNoticeChannel(guild, toSave.noticeChannelId);
          toSave.noticeChannelId = ch.id;
          const embed = buildNoticeEmbed(guild.name);
          await ch.send({ embeds: [embed] }).catch(() => null);
          const full = readConfig(guild.id) || {};
          full.aimonitor = toSave;
          writeConfig(guild.id, full);
          await interaction.editReply({
            content: '<:v6:1435697974431977522> Saved. AI Monitor is ready.',
            embeds: [embedSummary(toSave)],
            components: []
          });
          allCollector.stop('saved');
          return;
        }
      }

      if (i.isChannelSelectMenu()) {
        if (i.customId === 'aiwiz_channels_scan') {
          state.channels = i.values;
          await i.update({ embeds: [embedChannels(state)], components: rowsChannels(state) });
          return;
        }
        if (i.customId === 'aiwiz_channel_notice') {
          state.noticeChannelId = i.values[0] || null;
          await i.update({ embeds: [embedChannels(state)], components: rowsChannels(state) });
          return;
        }
      }

      if (i.isStringSelectMenu()) {
        if (i.customId === 'aiwiz_topics') {
          state.topics = i.values;
          await i.update({ embeds: [embedTopics(state)], components: rowsTopics(state) });
          return;
        }
        if (i.customId === 'aiwiz_strict') {
          state.strictness = Number(i.values[0]);
          await i.update({ embeds: [embedTopics(state)], components: rowsTopics(state) });
          return;
        }
        if (i.customId.startsWith('aiwiz_action_')) {
          const topic = i.customId.replace('aiwiz_action_', '');
          state.actions[topic] = i.values[0];
          await i.update({ embeds: [embedActions(state)], components: rowsActions(state) });
          return;
        }
      }

      if (i.isRoleSelectMenu()) {
        if (i.customId === 'aiwiz_roles_admin') {
          state.adminRoles = i.values;
          await i.update({ embeds: [embedRoles(state)], components: rowsRoles(state) });
          return;
        }
        if (i.customId === 'aiwiz_roles_protected') {
          state.protectedRoles = i.values;
          await i.update({ embeds: [embedRoles(state)], components: rowsRoles(state) });
          return;
        }
        if (i.customId === 'aiwiz_roles_exempt') {
          state.exemptRoles = i.values;
          await i.update({ embeds: [embedRoles(state)], components: rowsRoles(state) });
          return;
        }
      }
    });

    interaction.client.on('interactionCreate', async modal => {
      if (!modal.isModalSubmit()) return;
      if (modal.customId !== 'aiwiz_rules_modal') return;
      if (modal.user.id !== interaction.user.id) return;
      state.customRules = modal.fields.getTextInputValue('aiwiz_rules_text') || '';
      await modal.reply({ content: 'Rules updated.', ephemeral: true });
      await show(5);
    });

    collector.on('end', async (c, r) => {
      if (r === 'saved' || r === 'cancel') return;
      await interaction.editReply({ content: 'Setup timed out. Run `/setup-ai-monitor` again.', embeds: [], components: [] }).catch(() => null);
    });
  }
};
