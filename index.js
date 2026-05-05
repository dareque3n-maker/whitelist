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
  console.log(`✅ ShadowMc Bot Online: ${client.user.tag}`);
});


// =========================
// PANEL
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()
      .setTitle("⚡ ShadowMc Whitelist Gate")
      .setDescription(`
💰 Fee: **₹35**

⚠ Rules:
• Pocket Edition:
  ❌ STEVE PRO  
  ✔ _STEVE_PRO  

📌 Payment Status:
Confirm / Pending / Incomplete  

🔐 Enter the code given after payment
`)
      .setColor("Gold");

    const btn = new ButtonBuilder()
      .setCustomId("apply")
      .setLabel("Start Verification")
      .setStyle(ButtonStyle.Success);

    message.channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(btn)]
    });
  }
});


// =========================
// INTERACTIONS
// =========================
client.on("interactionCreate", async (interaction) => {

  // APPLY BUTTON
  if (interaction.isButton() && interaction.customId === "apply") {

    const modal = new ModalBuilder()
      .setCustomId("form")
      .setTitle("ShadowMc Verification");

    const mcname = new TextInputBuilder()
      .setCustomId("mc")
      .setLabel("Minecraft Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const payment = new TextInputBuilder()
      .setCustomId("pay")
      .setLabel("Payment Status (Confirm/Pending/Incomplete)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const code = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Verification Code")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(mcname),
      new ActionRowBuilder().addComponents(payment),
      new ActionRowBuilder().addComponents(code)
    );

    return interaction.showModal(modal);
  }

  // =========================
  // FORM SUBMIT
  // =========================
  if (interaction.isModalSubmit() && interaction.customId === "form") {

    const mcname = interaction.fields.getTextInputValue("mc").trim();
    const payment = interaction.fields.getTextInputValue("pay").toLowerCase();
    const code = interaction.fields.getTextInputValue("code").trim();

    const validPayment = ["confirm", "pending", "incomplete"].includes(payment);
    const codeValid = code === config.paymentCode;

    let status = "⚠ Payment Not Confirmed";
    let color = "Orange";

    if (validPayment && payment === "confirm" && codeValid) {
      status = "✔ Payment Verified (₹35 Confirmed)";
      color = "Green";
    } else if (!codeValid) {
      status = "❌ Invalid Verification Code";
      color = "Red";
    }

    const ticket = await interaction.guild.channels.create({
      name: `verify-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle("🔐 ShadowMc Verification Ticket")
      .setColor(color)
      .addFields(
        { name: "🎮 Username", value: mcname },
        { name: "💰 Payment", value: payment },
        { name: "🔑 Code", value: codeValid ? "✔ Correct" : "❌ Wrong" },
        { name: "📌 Status", value: status }
      );

    const approve = new ButtonBuilder()
      .setCustomId(`approve_${interaction.user.id}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId(`reject_${interaction.user.id}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    await ticket.send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(approve, reject)]
    });

    await interaction.reply({
      content: `🎟 Ticket created: ${ticket}`,
      ephemeral: true
    });
  }

  // =========================
  // APPROVE / REJECT
  // =========================
  if (interaction.isButton()) {

    if (!interaction.member.roles.cache.has(config.adminRoleId)) {
      return interaction.reply({ content: "❌ Staff only", ephemeral: true });
    }

    const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);

    const userId = interaction.customId.split("_")[1];
    const mcname = interaction.message.embeds[0].fields[0].value;

    const user = await client.users.fetch(userId).catch(() => null);

    // APPROVE
    if (interaction.customId.startsWith("approve_")) {

      const consoleChannel = await client.channels.fetch(config.consoleChannelId);
      await consoleChannel.send(`whitelist add ${mcname}`);

      if (user) {
        user.send(`🎉 You are whitelisted on ShadowMc as **${mcname}**`).catch(() => {});
      }

      if (logChannel) {
        logChannel.send(`🟢 Approved: ${mcname} by <@${interaction.user.id}>`);
      }

      await interaction.reply("✅ Approved");

      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }

    // REJECT
    if (interaction.customId.startsWith("reject_")) {

      if (user) {
        user.send(`❌ Your request was rejected`).catch(() => {});
      }

      if (logChannel) {
        logChannel.send(`🔴 Rejected: ${mcname} by <@${interaction.user.id}>`);
      }

      await interaction.reply("❌ Rejected");

      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
  }
});

client.login(process.env.TOKEN);
