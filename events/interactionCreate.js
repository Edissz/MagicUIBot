const fs = require("fs")
const {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  LabelBuilder,
  TextDisplayBuilder,
  FileUploadBuilder
} = require("discord.js")

const LOG_CHANNEL_ID = "1463916239528267839"

const BRAND = 0x2b79ee
const WHITE = 0xffffff
const DARK = 0x2b2d31
const GREEN = 0x57f287
const RED = 0xed4245

const STORE_FILE = "./supportRequests.json"

const TEAM_OPTIONS = [
  { label: "Customer Support", value: "support", desc: "General support + account + billing triage" },
  { label: "Development", value: "dev", desc: "Engineering / technical deep-dive" },
  { label: "Management", value: "management", desc: "Escalations / policy / decisions" }
]

const STAFF_ROLE_NAMES = ["Moderator", "Administrator", "Manager"]

function nowTs() {
  return Math.floor(Date.now() / 1000)
}

function safeJsonRead(p) {
  try {
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, "utf8"))
  } catch {
    return null
  }
}

function safeJsonWrite(p, obj) {
  try {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2))
    return true
  } catch {
    return false
  }
}

function ensureStore(client, guildId) {
  if (!client.__supportStore) {
    const loaded = safeJsonRead(STORE_FILE)
    client.__supportStore = loaded && typeof loaded === "object" ? loaded : {}
  }
  if (!client.__supportStore[guildId]) client.__supportStore[guildId] = {}
  return client.__supportStore[guildId]
}

function persistStore(client) {
  if (!client.__supportStore) return
  safeJsonWrite(STORE_FILE, client.__supportStore)
}

function isStaff(member) {
  if (!member) return false
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true
  if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true
  return member.roles.cache.some((r) => STAFF_ROLE_NAMES.includes(r.name))
}

function planLabel(v) {
  if (v === "pro") return "Pro"
  if (v === "free") return "Free"
  return v || "N/A"
}

function teamLabel(v) {
  const found = TEAM_OPTIONS.find((x) => x.value === v)
  return found ? found.label : "Unassigned"
}

function buildUserModal() {
  const modal = new ModalBuilder().setCustomId("support_contact_modal").setTitle("Contact MagicUI Support")

  const intro = new TextDisplayBuilder().setContent(
    "Fill this out clearly so we can help faster.\n-# Add logs/screenshots using the upload field if possible."
  )

  const planSelect = new StringSelectMenuBuilder()
    .setCustomId("plan")
    .setPlaceholder("Select your plan")
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("Free").setValue("free").setDescription("Using the free version"),
      new StringSelectMenuOptionBuilder().setLabel("Pro").setValue("pro").setDescription("Using a paid plan")
    )

  const planLabelWrap = new LabelBuilder()
    .setLabel("Plan")
    .setDescription("Choose the plan you are currently on")
    .setStringSelectMenuComponent(planSelect)

  const issue = new TextInputBuilder()
    .setCustomId("issue")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder("What’s happening? What do you need help with?")

  const issueLabel = new LabelBuilder()
    .setLabel("Issue")
    .setDescription("Explain the problem clearly")
    .setTextInputComponent(issue)

  const tried = new TextInputBuilder()
    .setCustomId("tried")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder("What did you try already? Include commands, config changes, etc.")

  const triedLabel = new LabelBuilder()
    .setLabel("What you tried")
    .setDescription("Anything you tried so far")
    .setTextInputComponent(tried)

  const email = new TextInputBuilder()
    .setCustomId("email")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(80)
    .setPlaceholder("Optional email (only if you want contact outside Discord)")

  const emailLabel = new LabelBuilder()
    .setLabel("Email (optional)")
    .setDescription("Leave empty if you prefer Discord only")
    .setTextInputComponent(email)

  const upload = new FileUploadBuilder()
    .setCustomId("files")
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(3)

  const uploadLabel = new LabelBuilder()
    .setLabel("Upload (optional)")
    .setDescription("Screenshots, logs, or short recordings (max 3)")
    .setFileUploadComponent(upload)

  modal
    .addTextDisplayComponents(intro)
    .addLabelComponents(planLabelWrap)
    .addLabelComponents(issueLabel)
    .addLabelComponents(triedLabel)
    .addLabelComponents(emailLabel)
    .addLabelComponents(uploadLabel)

  return modal
}

function buildStaffReplyModal(requestId) {
  const modal = new ModalBuilder().setCustomId(`support_staff_reply_modal:${requestId}`).setTitle("Reply to Support Request")

  const intro = new TextDisplayBuilder().setContent(
    "Write a professional reply. This will be sent to the user by DM.\n-# You can optionally attach files."
  )

  const message = new TextInputBuilder()
    .setCustomId("message")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500)
    .setPlaceholder("Hi! Thanks for reaching out… (include steps, links, and next actions)")

  const messageLabel = new LabelBuilder()
    .setLabel("Your reply")
    .setDescription("Keep it clear and actionable")
    .setTextInputComponent(message)

  const afterSelect = new StringSelectMenuBuilder()
    .setCustomId("after")
    .setPlaceholder("After sending...")
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("Keep Open").setValue("open").setDescription("User may need follow-up"),
      new StringSelectMenuOptionBuilder().setLabel("Resolve").setValue("resolve").setDescription("Mark as resolved and lock actions")
    )

  const afterLabel = new LabelBuilder()
    .setLabel("Status")
    .setDescription("Choose what happens after your reply")
    .setStringSelectMenuComponent(afterSelect)

  const upload = new FileUploadBuilder()
    .setCustomId("files")
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(3)

  const uploadLabel = new LabelBuilder()
    .setLabel("Attachments (optional)")
    .setDescription("Add up to 3 files")
    .setFileUploadComponent(upload)

  modal
    .addTextDisplayComponents(intro)
    .addLabelComponents(messageLabel)
    .addLabelComponents(afterLabel)
    .addLabelComponents(uploadLabel)

  return modal
}

function buildLogEmbed({ guild, user, plan, issue, tried, email, files, status, assignedTeam, createdAt, lastActionBy }) {
  const icon = guild?.iconURL?.({ dynamic: true, size: 128 }) || null
  const fileLinks = (files || []).length ? (files || []).map((f) => f.url || f.attachment || f).filter(Boolean) : []
  const filesText = fileLinks.length ? fileLinks.slice(0, 8).join("\n") : "N/A"

  const e = new EmbedBuilder()
    .setColor(status === "resolved" ? GREEN : WHITE)
    .setTitle(status === "resolved" ? "✅ Support Request — Resolved" : "🧾 New Support Request")
    .setThumbnail(icon)
    .setDescription(
      `**User:** ${user} \`(${user.id})\`\n` +
        `**Plan:** **${planLabel(plan)}**\n` +
        `**Status:** ${status === "resolved" ? "Resolved" : "Open"}\n` +
        `**Created:** <t:${createdAt || nowTs()}:F>`
    )
    .addFields(
      { name: "Issue", value: (issue || "N/A").slice(0, 1024) },
      { name: "What they tried", value: (tried || "N/A").slice(0, 1024) },
      { name: "Email", value: email && email.trim().length ? email.slice(0, 1024) : "N/A" },
      { name: "Uploads", value: filesText.slice(0, 1024) },
      { name: "Assigned Team", value: teamLabel(assignedTeam) }
    )
    .setFooter({ text: `REQ_USER:${user.id} | STATUS:${status || "open"}` })
    .setTimestamp()

  if (lastActionBy) {
    e.addFields({ name: "Last Action By", value: `${lastActionBy.tag} (${lastActionBy.id})` })
  }

  return e
}

function buildUserConfirmEmbed({ guild, plan, issueId }) {
  const icon = guild?.iconURL?.({ dynamic: true, size: 128 }) || null
  return new EmbedBuilder()
    .setColor(BRAND)
    .setAuthor({ name: "MagicUI Support", iconURL: icon || undefined })
    .setTitle("Request received")
    .setDescription(
      "Thanks for contacting **MagicUI Support**.\n\n" +
        "Your request has been logged and our team will respond as soon as possible.\n\n" +
        `**Plan:** ${planLabel(plan)}\n` +
        `**Request ID:** \`${issueId}\``
    )
    .setTimestamp()
}

function buildUserReplyEmbed({ guild, staffUser, body, status }) {
  const icon = guild?.iconURL?.({ dynamic: true, size: 128 }) || null
  const title = status === "resolved" ? "MagicUI Support — Resolved" : "MagicUI Support — Reply"
  return new EmbedBuilder()
    .setColor(status === "resolved" ? GREEN : BRAND)
    .setAuthor({ name: "MagicUI Support", iconURL: icon || undefined })
    .setTitle(title)
    .setDescription(
      `Hello,\n\n` +
        `${body}\n\n` +
        `— **${staffUser.tag}**`
    )
    .setTimestamp()
}

function buildAdminComponents(requestId, disabled) {
  const teamMenu = new StringSelectMenuBuilder()
    .setCustomId(`support_assign_team:${requestId}`)
    .setPlaceholder("Assign team…")
    .setDisabled(!!disabled)
    .addOptions(
      ...TEAM_OPTIONS.map((t) =>
        new StringSelectMenuOptionBuilder().setLabel(t.label).setValue(t.value).setDescription(t.desc)
      )
    )

  const teamRow = new ActionRowBuilder().addComponents(teamMenu)

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`support_reply:${requestId}`)
      .setLabel("Reply")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!!disabled),
    new ButtonBuilder()
      .setCustomId(`support_resolve:${requestId}`)
      .setLabel("Resolve")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!!disabled),
    new ButtonBuilder()
      .setCustomId(`support_close:${requestId}`)
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!!disabled)
  )

  return [teamRow, actionRow]
}

async function fetchLogChannel(guild) {
  const cached = guild.channels.cache.get(LOG_CHANNEL_ID)
  if (cached) return cached
  return await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null)
}

async function tryThread(msg, name) {
  try {
    if (!msg?.startThread) return null
    return await msg.startThread({ name: name.slice(0, 90), autoArchiveDuration: 1440 })
  } catch {
    return null
  }
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isButton() && interaction.customId === "support_contact") {
        return interaction.showModal(buildUserModal())
      }

      if (interaction.isModalSubmit() && interaction.customId === "support_contact_modal") {
        await interaction.deferReply({ ephemeral: true })

        const guild = interaction.guild
        if (!guild) return interaction.editReply({ content: "⚠️ This can only be used in a server." })

        const planArr = typeof interaction.fields.getStringSelectValues === "function"
          ? interaction.fields.getStringSelectValues("plan")
          : []
        const plan = planArr?.[0] || "N/A"

        const issue = interaction.fields.getTextInputValue("issue")
        const tried = interaction.fields.getTextInputValue("tried")
        const email = interaction.fields.getTextInputValue("email") || ""

        const files =
          typeof interaction.fields.getUploadedFiles === "function"
            ? interaction.fields.getUploadedFiles("files") || []
            : []

        const logChannel = await fetchLogChannel(guild)
        if (!logChannel || !logChannel.isTextBased()) {
          return interaction.editReply({ content: "⚠️ Log channel not found. Please contact an admin." })
        }

        const createdAt = nowTs()
        const reqEmbed = buildLogEmbed({
          guild,
          user: interaction.user,
          plan,
          issue,
          tried,
          email,
          files,
          status: "open",
          assignedTeam: null,
          createdAt
        })

        const msg = await logChannel.send({
          embeds: [reqEmbed],
          components: buildAdminComponents("pending", false)
        })

        await msg.edit({
          embeds: [reqEmbed],
          components: buildAdminComponents(msg.id, false)
        }).catch(() => null)

        const store = ensureStore(client, guild.id)
        store[msg.id] = {
          requestId: msg.id,
          userId: interaction.user.id,
          userTag: interaction.user.tag,
          plan,
          issue,
          tried,
          email,
          files: (files || []).map((f) => ({ url: f.url || f.attachment || null, name: f.name || null })).filter((x) => x.url),
          status: "open",
          assignedTeam: null,
          createdAt,
          lastActionById: null,
          lastActionByTag: null
        }
        persistStore(client)

        await tryThread(msg, `support-${interaction.user.username}-${msg.id}`).catch(() => null)

        try {
          const dmEmbed = buildUserConfirmEmbed({ guild, plan, issueId: msg.id })
          await interaction.user.send({ embeds: [dmEmbed] })
        } catch {}

        await interaction.editReply({ content: "✅ Submitted. Your request has been sent to the MagicUI team." })
        return
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("support_assign_team:")) {
        if (!isStaff(interaction.member)) {
          return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true })
        }

        const guild = interaction.guild
        if (!guild) return

        const requestId = interaction.customId.split(":")[1]
        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.reply({ content: "⚠️ Request not found.", ephemeral: true })
        if (item.status === "resolved") return interaction.reply({ content: "⚠️ Already resolved.", ephemeral: true })

        const team = interaction.values?.[0] || null
        item.assignedTeam = team
        item.lastActionById = interaction.user.id
        item.lastActionByTag = interaction.user.tag
        persistStore(client)

        const user = await client.users.fetch(item.userId).catch(() => null)
        const reqEmbed = buildLogEmbed({
          guild,
          user: user || { id: item.userId, toString: () => `<@${item.userId}>` },
          plan: item.plan,
          issue: item.issue,
          tried: item.tried,
          email: item.email,
          files: (item.files || []).map((x) => x.url).filter(Boolean),
          status: item.status,
          assignedTeam: item.assignedTeam,
          createdAt: item.createdAt,
          lastActionBy: interaction.user
        })

        await interaction.message.edit({
          embeds: [reqEmbed],
          components: buildAdminComponents(requestId, false)
        }).catch(() => null)

        return interaction.reply({ content: `✅ Assigned to **${teamLabel(team)}**.`, ephemeral: true })
      }

      if (interaction.isButton() && interaction.customId.startsWith("support_reply:")) {
        if (!isStaff(interaction.member)) {
          return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true })
        }
        const requestId = interaction.customId.split(":")[1]
        const guild = interaction.guild
        if (!guild) return interaction.reply({ content: "⚠️ Invalid context.", ephemeral: true })

        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.reply({ content: "⚠️ Request not found.", ephemeral: true })
        if (item.status === "resolved") return interaction.reply({ content: "⚠️ This request is resolved.", ephemeral: true })

        return interaction.showModal(buildStaffReplyModal(requestId))
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("support_staff_reply_modal:")) {
        await interaction.deferReply({ ephemeral: true })

        const guild = interaction.guild
        if (!guild) return interaction.editReply({ content: "⚠️ Invalid context." })
        if (!isStaff(interaction.member)) return interaction.editReply({ content: "⚠️ Not allowed." })

        const requestId = interaction.customId.split(":")[1]
        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.editReply({ content: "⚠️ Request not found." })
        if (item.status === "resolved") return interaction.editReply({ content: "⚠️ Already resolved." })

        const body = interaction.fields.getTextInputValue("message")

        const afterArr = typeof interaction.fields.getStringSelectValues === "function"
          ? interaction.fields.getStringSelectValues("after")
          : []
        const after = afterArr?.[0] || "open"

        const files =
          typeof interaction.fields.getUploadedFiles === "function"
            ? interaction.fields.getUploadedFiles("files") || []
            : []

        const targetUser = await client.users.fetch(item.userId).catch(() => null)
        if (!targetUser) return interaction.editReply({ content: "⚠️ Could not fetch user." })

        let dmOk = true
        try {
          const dmEmbed = buildUserReplyEmbed({
            guild,
            staffUser: interaction.user,
            body,
            status: after === "resolve" ? "resolved" : "open"
          })
          const urls = (files || []).map((f) => f.url || f.attachment).filter(Boolean)
          const payload = urls.length ? { embeds: [dmEmbed], content: urls.slice(0, 5).join("\n") } : { embeds: [dmEmbed] }
          await targetUser.send(payload)
        } catch {
          dmOk = false
        }

        item.lastActionById = interaction.user.id
        item.lastActionByTag = interaction.user.tag

        if (after === "resolve") item.status = "resolved"
        persistStore(client)

        const userObj = targetUser
        const reqEmbed = buildLogEmbed({
          guild,
          user: userObj,
          plan: item.plan,
          issue: item.issue,
          tried: item.tried,
          email: item.email,
          files: (item.files || []).map((x) => x.url).filter(Boolean),
          status: item.status,
          assignedTeam: item.assignedTeam,
          createdAt: item.createdAt,
          lastActionBy: interaction.user
        })

        const disabled = item.status === "resolved"
        try {
          await interaction.message.edit({
            embeds: [reqEmbed],
            components: buildAdminComponents(requestId, disabled)
          })
        } catch {}

        if (!dmOk) {
          return interaction.editReply({ content: "⚠️ DM failed. Ask the user to enable DMs or contact them in-server." })
        }

        return interaction.editReply({
          content: after === "resolve" ? "✅ Reply sent + marked as resolved." : "✅ Reply sent."
        })
      }

      if (interaction.isButton() && interaction.customId.startsWith("support_resolve:")) {
        if (!isStaff(interaction.member)) {
          return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true })
        }

        const guild = interaction.guild
        if (!guild) return interaction.reply({ content: "⚠️ Invalid context.", ephemeral: true })

        const requestId = interaction.customId.split(":")[1]
        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.reply({ content: "⚠️ Request not found.", ephemeral: true })
        if (item.status === "resolved") return interaction.reply({ content: "⚠️ Already resolved.", ephemeral: true })

        item.status = "resolved"
        item.lastActionById = interaction.user.id
        item.lastActionByTag = interaction.user.tag
        persistStore(client)

        const user = await client.users.fetch(item.userId).catch(() => null)
        const reqEmbed = buildLogEmbed({
          guild,
          user: user || { id: item.userId, toString: () => `<@${item.userId}>` },
          plan: item.plan,
          issue: item.issue,
          tried: item.tried,
          email: item.email,
          files: (item.files || []).map((x) => x.url).filter(Boolean),
          status: "resolved",
          assignedTeam: item.assignedTeam,
          createdAt: item.createdAt,
          lastActionBy: interaction.user
        })

        await interaction.message.edit({
          embeds: [reqEmbed],
          components: buildAdminComponents(requestId, true)
        }).catch(() => null)

        try {
          if (user) {
            const dm = new EmbedBuilder()
              .setColor(GREEN)
              .setTitle("MagicUI Support — Resolved")
              .setDescription("Your support request has been marked as **resolved**.\n\nIf you still need help, submit a new request with updated details.")
              .setTimestamp()
            await user.send({ embeds: [dm] })
          }
        } catch {}

        return interaction.reply({ content: "✅ Marked as resolved.", ephemeral: true })
      }

      if (interaction.isButton() && interaction.customId.startsWith("support_close:")) {
        if (!isStaff(interaction.member)) {
          return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true })
        }

        const guild = interaction.guild
        if (!guild) return interaction.reply({ content: "⚠️ Invalid context.", ephemeral: true })

        const requestId = interaction.customId.split(":")[1]
        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.reply({ content: "⚠️ Request not found.", ephemeral: true })

        item.status = "resolved"
        item.lastActionById = interaction.user.id
        item.lastActionByTag = interaction.user.tag
        persistStore(client)

        await interaction.message.edit({
          components: buildAdminComponents(requestId, true)
        }).catch(() => null)

        return interaction.reply({ content: "✅ Closed actions for this request.", ephemeral: true })
      }
    } catch (err) {
      console.error("❌ interactionCreate error:", err)
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "⚠️ Something went wrong.", ephemeral: true })
        } else {
          await interaction.followUp({ content: "⚠️ Something went wrong.", ephemeral: true })
        }
      } catch {}
    }
  }
}
