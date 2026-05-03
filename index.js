const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`✨ Sparkle SMP Nexus Online: ${client.user.tag}`);
});


// =========================
// PANEL
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()
      .setTitle("⚡ Sparkle SMP Nexus Whitelist Gate")
      .setDescription(`
🎮 **Access Whitelist System**

💰 Fee: **₹35 Only (Fixed)**

⚠ Guidelines:
• Pocket Edition users must use "_" prefix  
• Example: _steve  
• Fake payment or wrong info = instant reject  

🚀 Click below to begin verification
`)
      .setColor("Gold");

    const btn = new ButtonBuilder()
      .setCustomId("apply_whitelist")
      .setLabel("Start Verification")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btn);

    message.channel.send({ embeds: [embed], components: [row] });
  }
});


// =========================
// INTERACTIONS
// =========================
client.on("interactionCreate", async (interaction) => {

  // =========================
  // APPLY BUTTON
  // =========================
  if (interaction.isButton() && interaction.customId === "apply_whitelist") {

    const modal = new ModalBuilder()
      .setCustomId("whitelist_form")
      .setTitle("Nexus Verification Form");

    const mcname = new TextInputBuilder()
      .setCustomId("mcname")
      .setLabel("Minecraft Username")
      .setPlaceholder("Example: _steve or alex")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const payment = new TextInputBuilder()
      .setCustomId("payment")
      .setLabel("Payment Status (Enter TXN / Paid / UPI Ref)")
      .setPlaceholder("Must prove ₹35 payment")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(mcname),
      new ActionRowBuilder().addComponents(payment)
    );

    await interaction.showModal(modal);
  }


  // =========================
  // FORM SUBMIT
  // =========================
  if (interaction.isModalSubmit() && interaction.customId === "whitelist_form") {

    const mcname = interaction.fields.getTextInputValue("mcname").trim();
    const paymentRaw = interaction.fields.getTextInputValue("payment").toLowerCase();

    // =========================
    // PAYMENT VALIDATION
    // =========================
    const paymentKeywords = ["paid", "35", "35rs", "35₹", "done", "success", "upi", "txn"];

    let paymentVerified = paymentKeywords.some(k => paymentRaw.includes(k));

    // TICKET
    const ticket = await interaction.guild.channels.create({
      name: `verify-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle("🔐 Nexus Verification Ticket")
      .setColor(paymentVerified ? "Green" : "Red")
      .addFields(
        { name: "🎮 Username", value: mcname },
        { name: "💰 Payment Check", value: paymentRaw },
        { name: "📌 Status", value: paymentVerified ? "✔ Payment Detected (₹35 Confirmed)" : "❌ Payment Not Verified" }
      )
      .setFooter({ text: "Staff will verify & approve manually" });

    const approve = new ButtonBuilder()
      .setCustomId(`approve_${interaction.user.id}`)
      .setLabel("APPROVE")
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId(`reject_${interaction.user.id}`)
      .setLabel("REJECT")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(approve, reject);

    await ticket.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: `⚡ Verification started: ${ticket}`,
      ephemeral: true
    });
  }


  // =========================
  // APPROVE / REJECT
  // =========================
  if (interaction.isButton()) {

    if (
      interaction.customId.startsWith("approve_") ||
      interaction.customId.startsWith("reject_")
    ) {
      if (!interaction.member.roles.cache.has(config.adminRoleId)) {
        return interaction.reply({
          content: "❌ Staff only system.",
          ephemeral: true
        });
      }
    }

    const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);

    // =========================
    // APPROVE
    // =========================
    if (interaction.customId.startsWith("approve_")) {

      const userId = interaction.customId.split("_")[1];
      const mcname = interaction.message.embeds[0].fields[0].value;

      const consoleChannel = await client.channels.fetch(config.consoleChannelId);
      await consoleChannel.send(`whitelist add ${mcname}`);

      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        user.send(`🎉 Congratulations! You are now whitelisted on **Sparkle SMP** as **${mcname}** ✔`).catch(() => {});
      }

      if (logChannel && logChannel.isTextBased()) {
        logChannel.send(`🟢 VERIFIED: **${mcname}** approved by <@${interaction.user.id}>`);
      }

      await interaction.reply("✔ Approved & Whitelisted");

      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }


    // =========================
    // REJECT
    // =========================
    if (interaction.customId.startsWith("reject_")) {

      const userId = interaction.customId.split("_")[1];
      const mcname = interaction.message.embeds[0].fields[0].value;

      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        user.send(`❌ Sorry! Your whitelist request was rejected for **${mcname}**`).catch(() => {});
      }

      if (logChannel && logChannel.isTextBased()) {
        logChannel.send(`🔴 REJECTED: **${mcname}** by <@${interaction.user.id}>`);
      }

      await interaction.reply("❌ Rejected");

      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
  }
});

client.login(process.env.TOKEN);
