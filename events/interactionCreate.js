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
  StringSelectMenuBuilder
} = require("discord.js")

const LOG_CHANNEL_ID = "1463916239528267839"

const WHITE = 0xffffff
const BRAND = 0x2b79ee
const GREEN = 0x57f287
const DARK = 0x2b2d31

const STORE_FILE = "./supportRequests.json"
const STAFF_ROLE_NAMES = ["Moderator", "Administrator", "Manager"]

function nowTs() {
  return Math.floor(Date.now() / 1000)
}

function safeRead() {
  try {
    if (!fs.existsSync(STORE_FILE)) return {}
    const raw = fs.readFileSync(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function safeWrite(obj) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(obj, null, 2))
    return true
  } catch {
    return false
  }
}

function ensureStore(client, guildId) {
  if (!client.__supportStore) client.__supportStore = safeRead()
  if (!client.__supportStore[guildId]) client.__supportStore[guildId] = {}
  return client.__supportStore[guildId]
}

function persist(client) {
  if (!client.__supportStore) return
  safeWrite(client.__supportStore)
}

function ensureDrafts(client) {
  if (!client.__supportDrafts) client.__supportDrafts = new Map()
  return client.__supportDrafts
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
  if (v === "support") return "Customer Support"
  if (v === "dev") return "Development"
  if (v === "management") return "Management"
  return "Unassigned"
}

async function getLogChannel(guild) {
  const cached = guild.channels.cache.get(LOG_CHANNEL_ID)
  if (cached) return cached
  return await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null)
}

function supportsV2Modal() {
  const djs = require("discord.js")
  const hasLabel = typeof djs.LabelBuilder === "function"
  const hasTextDisplay = typeof djs.TextDisplayBuilder === "function"
  const hasFileUpload = typeof djs.FileUploadBuilder === "function"
  const modal = new ModalBuilder()
  const hasMethods =
    typeof modal.addLabelComponents === "function" &&
    typeof modal.addTextDisplayComponents === "function"
  return hasLabel && hasTextDisplay && hasFileUpload && hasMethods
}

function buildPanelConfirmEmbed(guild, requestId, plan) {
  const icon = guild?.iconURL?.({ dynamic: true, size: 128 }) || undefined
  return new EmbedBuilder()
    .setColor(BRAND)
    .setAuthor({ name: "MagicUI Support", iconURL: icon })
    .setTitle("Request received")
    .setDescription(
      "Your request has been submitted successfully.\n\n" +
        "Our team will respond as soon as possible.\n\n" +
        `**Plan:** ${planLabel(plan)}\n` +
        `**Request ID:** \`${requestId}\``
    )
    .setTimestamp()
}

function buildUserReplyEmbed(guild, staffUser, body) {
  const icon = guild?.iconURL?.({ dynamic: true, size: 128 }) || undefined
  return new EmbedBuilder()
    .setColor(BRAND)
    .setAuthor({ name: "MagicUI Support", iconURL: icon })
    .setTitle("Support reply")
    .setDescription(`Hello,\n\n${body}\n\n— **${staffUser.tag}**`)
    .setTimestamp()
}

function buildUserResolvedEmbed(guild) {
  const icon = guild?.iconURL?.({ dynamic: true, size: 128 }) || undefined
  return new EmbedBuilder()
    .setColor(GREEN)
    .setAuthor({ name: "MagicUI Support", iconURL: icon })
    .setTitle("Resolved")
    .setDescription(
      "Your support request has been marked as **resolved**.\n\n" +
        "If you still need help, submit a new request with updated details."
    )
    .setTimestamp()
}

function buildLogEmbed(guild, user, data) {
  const icon = guild?.iconURL?.({ dynamic: true, size: 128 }) || null
  const status = data.status || "open"
  const uploadsText = Array.isArray(data.uploads) && data.uploads.length ? data.uploads.slice(0, 8).join("\n") : "N/A"

  const e = new EmbedBuilder()
    .setColor(status === "resolved" ? GREEN : WHITE)
    .setTitle(status === "resolved" ? "✅ Support Request — Resolved" : "🧾 Support Request")
    .setThumbnail(icon)
    .setDescription(
      `**User:** ${user} \`(${user.id})\`\n` +
        `**Plan:** **${planLabel(data.plan)}**\n` +
        `**Status:** ${status === "resolved" ? "Resolved" : "Open"}\n` +
        `**Created:** <t:${data.createdAt || nowTs()}:F>`
    )
    .addFields(
      { name: "Issue", value: (data.issue || "N/A").slice(0, 1024) },
      { name: "What they tried", value: (data.tried || "N/A").slice(0, 1024) },
      { name: "Email", value: data.email && data.email.trim().length ? data.email.slice(0, 1024) : "N/A" },
      { name: "Uploads", value: uploadsText.slice(0, 1024) },
      { name: "Assigned Team", value: teamLabel(data.team) }
    )
    .setFooter({ text: `REQ_USER:${user.id} | STATUS:${status}` })
    .setTimestamp()

  if (data.lastActionByTag) {
    e.addFields({ name: "Last Action By", value: `${data.lastActionByTag} (${data.lastActionById || "N/A"})` })
  }

  return e
}

function adminComponents(requestId, disabled) {
  const teamMenu = new StringSelectMenuBuilder()
    .setCustomId(`support_team:${requestId}`)
    .setPlaceholder("Assign team…")
    .setDisabled(!!disabled)
    .addOptions(
      { label: "Customer Support", value: "support", description: "General support + triage" },
      { label: "Development", value: "dev", description: "Engineering / technical deep-dive" },
      { label: "Management", value: "management", description: "Escalations / decisions" }
    )

  const row1 = new ActionRowBuilder().addComponents(teamMenu)

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`support_reply:${requestId}`).setLabel("Reply").setStyle(ButtonStyle.Secondary).setDisabled(!!disabled),
    new ButtonBuilder().setCustomId(`support_resolve:${requestId}`).setLabel("Resolve").setStyle(ButtonStyle.Success).setDisabled(!!disabled)
  )

  return [row1, row2]
}

function buildFallbackPlanPicker() {
  const embed = new EmbedBuilder()
    .setColor(DARK)
    .setTitle("Select your plan")
    .setDescription("Choose your plan first. Then the support form will open.")

  const menu = new StringSelectMenuBuilder()
    .setCustomId("support_plan_select")
    .setPlaceholder("Choose plan…")
    .addOptions(
      { label: "Free", value: "free", description: "Using the free version" },
      { label: "Pro", value: "pro", description: "Using a paid plan" }
    )

  const row = new ActionRowBuilder().addComponents(menu)
  return { embeds: [embed], components: [row], ephemeral: true }
}

function buildFallbackModal() {
  const modal = new ModalBuilder().setCustomId("support_contact_modal_fallback").setTitle("Contact MagicUI Support")

  const issue = new TextInputBuilder()
    .setCustomId("issue")
    .setLabel("Issue")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder("What’s happening? What do you need help with?")

  const tried = new TextInputBuilder()
    .setCustomId("tried")
    .setLabel("What you tried")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder("Commands you ran, configs, what happened…")

  const email = new TextInputBuilder()
    .setCustomId("email")
    .setLabel("Email (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(80)
    .setPlaceholder("Optional email")

  const uploads = new TextInputBuilder()
    .setCustomId("uploads")
    .setLabel("Uploads (optional links)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(300)
    .setPlaceholder("Paste links to screenshots/logs if you have them")

  modal.addComponents(
    new ActionRowBuilder().addComponents(issue),
    new ActionRowBuilder().addComponents(tried),
    new ActionRowBuilder().addComponents(email),
    new ActionRowBuilder().addComponents(uploads)
  )

  return modal
}

function buildReplyModal(requestId) {
  const modal = new ModalBuilder().setCustomId(`support_staff_reply_modal:${requestId}`).setTitle("Reply to user")

  const subject = new TextInputBuilder()
    .setCustomId("subject")
    .setLabel("Subject (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100)
    .setPlaceholder("MagicUI Support — Update")

  const body = new TextInputBuilder()
    .setCustomId("body")
    .setLabel("Message")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1500)
    .setPlaceholder("Write a clear, professional reply with next steps.")

  const links = new TextInputBuilder()
    .setCustomId("links")
    .setLabel("Links (optional)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(300)
    .setPlaceholder("Docs / image links / resources")

  modal.addComponents(
    new ActionRowBuilder().addComponents(subject),
    new ActionRowBuilder().addComponents(body),
    new ActionRowBuilder().addComponents(links)
  )

  return modal
}

async function createAndLogRequest(interaction, client, payload) {
  const guild = interaction.guild
  const logChannel = await getLogChannel(guild)
  if (!logChannel || !logChannel.isTextBased()) {
    return { ok: false, error: "Log channel not found or not text-based." }
  }

  const store = ensureStore(client, guild.id)

  const createdAt = nowTs()
  const temp = {
    plan: payload.plan || "N/A",
    issue: payload.issue || "",
    tried: payload.tried || "",
    email: payload.email || "",
    uploads: payload.uploads || [],
    status: "open",
    team: null,
    createdAt,
    lastActionById: null,
    lastActionByTag: null
  }

  const msg = await logChannel.send({
    embeds: [buildLogEmbed(guild, interaction.user, temp)],
    components: adminComponents("pending", false)
  })

  await msg.edit({
    embeds: [buildLogEmbed(guild, interaction.user, temp)],
    components: adminComponents(msg.id, false)
  }).catch(() => null)

  store[msg.id] = {
    requestId: msg.id,
    userId: interaction.user.id,
    userTag: interaction.user.tag,
    ...temp
  }

  persist(client)

  try {
    await interaction.user.send({ embeds: [buildPanelConfirmEmbed(guild, msg.id, temp.plan)] })
  } catch {}

  return { ok: true, requestId: msg.id, messageId: msg.id }
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    try {
      if (interaction.isButton() && interaction.customId === "support_contact") {
        if (supportsV2Modal()) {
          const djs = require("discord.js")
          const { LabelBuilder, TextDisplayBuilder, FileUploadBuilder, StringSelectMenuOptionBuilder } = djs

          const modal = new ModalBuilder().setCustomId("support_contact_modal_v2").setTitle("Contact MagicUI Support")

          const intro = new TextDisplayBuilder().setContent(
            "Fill this clearly so we can help faster.\n-# Add screenshots/logs using Upload if possible."
          )

          const planMenu = new StringSelectMenuBuilder()
            .setCustomId("plan")
            .setPlaceholder("Select your plan")
            .setRequired(true)
            .addOptions(
              new StringSelectMenuOptionBuilder().setLabel("Free").setValue("free").setDescription("Using the free version"),
              new StringSelectMenuOptionBuilder().setLabel("Pro").setValue("pro").setDescription("Using a paid plan")
            )

          const planLabel = new LabelBuilder()
            .setLabel("Plan")
            .setDescription("Choose the plan you are on")
            .setStringSelectMenuComponent(planMenu)

          const issue = new TextInputBuilder()
            .setCustomId("issue")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setPlaceholder("What’s happening? What do you need help with?")

          const issueLabel = new LabelBuilder()
            .setLabel("Issue")
            .setDescription("Explain it clearly")
            .setTextInputComponent(issue)

          const tried = new TextInputBuilder()
            .setCustomId("tried")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setPlaceholder("Commands you ran, configs, what happened…")

          const triedLabel = new LabelBuilder()
            .setLabel("What you tried")
            .setDescription("Anything you tried so far")
            .setTextInputComponent(tried)

          const email = new TextInputBuilder()
            .setCustomId("email")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(80)
            .setPlaceholder("Optional email")

          const emailLabel = new LabelBuilder()
            .setLabel("Email (optional)")
            .setDescription("Leave empty if Discord only")
            .setTextInputComponent(email)

          const upload = new FileUploadBuilder()
            .setCustomId("files")
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(3)

          const uploadLabel = new LabelBuilder()
            .setLabel("Upload (optional)")
            .setDescription("Screenshots, logs, short clips (max 3)")
            .setFileUploadComponent(upload)

          modal
            .addTextDisplayComponents(intro)
            .addLabelComponents(planLabel)
            .addLabelComponents(issueLabel)
            .addLabelComponents(triedLabel)
            .addLabelComponents(emailLabel)
            .addLabelComponents(uploadLabel)

          return interaction.showModal(modal)
        }

        return interaction.reply(buildFallbackPlanPicker())
      }

      if (interaction.isStringSelectMenu() && interaction.customId === "support_plan_select") {
        const drafts = ensureDrafts(client)
        const plan = interaction.values?.[0] || "N/A"
        drafts.set(`${interaction.guildId}:${interaction.user.id}`, { plan, at: Date.now() })
        await interaction.deferUpdate()
        return interaction.showModal(buildFallbackModal())
      }

      if (interaction.isModalSubmit() && (interaction.customId === "support_contact_modal_fallback" || interaction.customId === "support_contact_modal_v2")) {
        await interaction.deferReply({ ephemeral: true })
        const guild = interaction.guild
        if (!guild) return interaction.editReply({ content: "⚠️ This can only be used in a server." })

        let plan = "N/A"
        let uploads = []

        if (interaction.customId === "support_contact_modal_v2") {
          if (typeof interaction.fields?.getStringSelectValues === "function") {
            const v = interaction.fields.getStringSelectValues("plan")
            plan = v?.[0] || "N/A"
          }
          if (typeof interaction.fields?.getUploadedFiles === "function") {
            const files = interaction.fields.getUploadedFiles("files")
            if (files && files.size) uploads = [...files.values()].map((a) => a.url).filter(Boolean)
          }
        } else {
          const drafts = ensureDrafts(client)
          const key = `${interaction.guildId}:${interaction.user.id}`
          const draft = drafts.get(key)
          if (draft?.plan) plan = draft.plan
          drafts.delete(key)
          const upl = interaction.fields.getTextInputValue("uploads") || ""
          uploads = upl.trim().length ? upl.trim().split(/\s+/).slice(0, 8) : []
        }

        const issue = interaction.fields.getTextInputValue("issue")
        const tried = interaction.fields.getTextInputValue("tried")
        const email = interaction.fields.getTextInputValue("email") || ""

        const result = await createAndLogRequest(interaction, client, { plan, issue, tried, email, uploads })
        if (!result.ok) return interaction.editReply({ content: `⚠️ ${result.error || "Failed to log request."}` })

        return interaction.editReply({ content: "✅ Submitted. Check your DMs for confirmation." })
      }

      if (interaction.isStringSelectMenu() && interaction.customId.startsWith("support_team:")) {
        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true })
        const guild = interaction.guild
        if (!guild) return

        const requestId = interaction.customId.split(":")[1]
        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.reply({ content: "⚠️ Request not found.", ephemeral: true })
        if (item.status === "resolved") return interaction.reply({ content: "⚠️ Already resolved.", ephemeral: true })

        item.team = interaction.values?.[0] || null
        item.lastActionById = interaction.user.id
        item.lastActionByTag = interaction.user.tag
        persist(client)

        const user = await client.users.fetch(item.userId).catch(() => null)
        if (!user) return interaction.reply({ content: "⚠️ User not found.", ephemeral: true })

        const embed = buildLogEmbed(guild, user, item)
        await interaction.message.edit({ embeds: [embed], components: adminComponents(requestId, false) }).catch(() => null)

        return interaction.reply({ content: `✅ Assigned to **${teamLabel(item.team)}**.`, ephemeral: true })
      }

      if (interaction.isButton() && interaction.customId.startsWith("support_reply:")) {
        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true })
        const requestId = interaction.customId.split(":")[1]
        const guild = interaction.guild
        if (!guild) return interaction.reply({ content: "⚠️ Invalid context.", ephemeral: true })

        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.reply({ content: "⚠️ Request not found.", ephemeral: true })
        if (item.status === "resolved") return interaction.reply({ content: "⚠️ This request is resolved.", ephemeral: true })

        return interaction.showModal(buildReplyModal(requestId))
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith("support_staff_reply_modal:")) {
        await interaction.deferReply({ ephemeral: true })
        if (!isStaff(interaction.member)) return interaction.editReply({ content: "⚠️ Not allowed." })

        const guild = interaction.guild
        if (!guild) return interaction.editReply({ content: "⚠️ Invalid context." })

        const requestId = interaction.customId.split(":")[1]
        const store = ensureStore(client, guild.id)
        const item = store[requestId]
        if (!item) return interaction.editReply({ content: "⚠️ Request not found." })
        if (item.status === "resolved") return interaction.editReply({ content: "⚠️ Already resolved." })

        const subject = interaction.fields.getTextInputValue("subject") || ""
        const body = interaction.fields.getTextInputValue("body")
        const links = interaction.fields.getTextInputValue("links") || ""

        const user = await client.users.fetch(item.userId).catch(() => null)
        if (!user) return interaction.editReply({ content: "⚠️ User not found." })

        let dmOk = true
        try {
          const embed = buildUserReplyEmbed(guild, interaction.user, (subject.trim().length ? `**${subject.trim()}**\n\n` : "") + body)
          const payload = links.trim().length ? { embeds: [embed], content: links.trim() } : { embeds: [embed] }
          await user.send(payload)
        } catch {
          dmOk = false
        }

        item.lastActionById = interaction.user.id
        item.lastActionByTag = interaction.user.tag
        persist(client)

        if (!dmOk) return interaction.editReply({ content: "⚠️ DM failed. Ask the user to enable DMs." })
        return interaction.editReply({ content: "✅ Reply sent by DM." })
      }

      if (interaction.isButton() && interaction.customId.startsWith("support_resolve:")) {
        if (!isStaff(interaction.member)) return interaction.reply({ content: "⚠️ Not allowed.", ephemeral: true })
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
        persist(client)

        const user = await client.users.fetch(item.userId).catch(() => null)
        if (user) {
          try {
            await user.send({ embeds: [buildUserResolvedEmbed(guild)] })
          } catch {}
        }

        if (user) {
          const embed = buildLogEmbed(guild, user, item)
          await interaction.message.edit({ embeds: [embed], components: adminComponents(requestId, true) }).catch(() => null)
        } else {
          await interaction.message.edit({ components: adminComponents(requestId, true) }).catch(() => null)
        }

        return interaction.reply({ content: "✅ Marked as resolved.", ephemeral: true })
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
