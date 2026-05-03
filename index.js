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
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =========================
// BOT READY
// =========================
client.once("ready", () => {
  console.log(`✅ Sparkle SMP Bot Online: ${client.user.tag}`);
});


// =========================
// PANEL SETUP COMMAND
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()
      .setTitle("🔥 Sparkle SMP Whitelist System")
      .setDescription(`
🎮 Welcome to **Sparkle SMP**

Click below to apply for whitelist.

⚠ Rules:
- Pocket Edition players must use "_" (Example: _steve)
- Fake applications will be rejected
`)
      .setColor("Green");

    const button = new ButtonBuilder()
      .setCustomId("apply_whitelist")
      .setLabel("Apply for Whitelist")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    message.channel.send({ embeds: [embed], components: [row] });
  }
});


// =========================
// INTERACTIONS
// =========================
client.on("interactionCreate", async (interaction) => {

  // =========================
  // APPLY BUTTON → MODAL
  // =========================
  if (interaction.isButton() && interaction.customId === "apply_whitelist") {

    const modal = new ModalBuilder()
      .setCustomId("whitelist_form")
      .setTitle("Sparkle SMP Application");

    const mcname = new TextInputBuilder()
      .setCustomId("mcname")
      .setLabel("Minecraft Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const payment = new TextInputBuilder()
      .setCustomId("payment")
      .setLabel("Payment Status (Paid / Pending)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(mcname);
    const row2 = new ActionRowBuilder().addComponents(payment);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }


  // =========================
  // MODAL SUBMIT → TICKET
  // =========================
  if (interaction.isModalSubmit() && interaction.customId === "whitelist_form") {

    const mcname = interaction.fields.getTextInputValue("mcname");
    const payment = interaction.fields.getTextInputValue("payment");

    console.log("📌 MC NAME:", mcname);

    // ✅ CREATE TICKET CHANNEL
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
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
      .setTitle("📩 Whitelist Ticket")
      .setColor("Blue")
      .addFields(
        { name: "🎮 Minecraft Username", value: mcname },
        { name: "💰 Payment Status", value: payment },
        { name: "👤 User", value: interaction.user.tag }
      );

    const approve = new ButtonBuilder()
      .setCustomId(`approve_${mcname}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId(`reject_${mcname}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(approve, reject);

    await ticketChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: `🎟 Ticket created: ${ticketChannel}`,
      ephemeral: true
    });
  }


  // =========================
  // APPROVE / REJECT
  // =========================
  if (interaction.isButton()) {

    // APPROVE
    if (interaction.customId.startsWith("approve_")) {

      const mcname = interaction.customId.replace("approve_", "");

      const consoleChannel = await client.channels.fetch(config.consoleChannelId);

      await consoleChannel.send(`whitelist add ${mcname}`);

      await interaction.reply(`✅ Whitelisted: **${mcname}**`);
    }

    // REJECT
    if (interaction.customId.startsWith("reject_")) {
      await interaction.reply("❌ Application Rejected");
    }
  }
});

client.login(process.env.TOKEN);
