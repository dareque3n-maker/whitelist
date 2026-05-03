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
  PermissionsBitField
} = require("discord.js");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
});


// =========================
// SETUP COMMAND (panel)
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()
      .setTitle("🟢 Sparkle SMP Whitelist System")
      .setDescription(`
🎮 Join Sparkle SMP Survival Server

Click below to apply for whitelist.

⚠ Pocket Edition players MUST use underscore (_)
Example: _steve
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
// BUTTON CLICK → MODAL
// =========================
client.on("interactionCreate", async (interaction) => {

  // APPLY BUTTON
  if (interaction.isButton() && interaction.customId === "apply_whitelist") {

    const modal = new ModalBuilder()
      .setCustomId("whitelist_form")
      .setTitle("Sparkle SMP Application");

    const mcName = new TextInputBuilder()
      .setCustomId("mcname")
      .setLabel("Minecraft Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const payment = new TextInputBuilder()
      .setCustomId("payment")
      .setLabel("Payment Status (Paid / Pending)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(mcName);
    const row2 = new ActionRowBuilder().addComponents(payment);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }


  // =========================
  // MODAL SUBMIT
  // =========================
  if (interaction.isModalSubmit() && interaction.customId === "whitelist_form") {

    const mcname = interaction.fields.getTextInputValue("mcname");
    const payment = interaction.fields.getTextInputValue("payment");

    // Create ticket channel
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle("📩 Whitelist Ticket")
      .addFields(
        { name: "Minecraft Name", value: mcname },
        { name: "Payment", value: payment },
        { name: "User", value: interaction.user.tag }
      )
      .setColor("Blue");

    const approveBtn = new ButtonBuilder()
      .setCustomId(`approve_${mcname}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const rejectBtn = new ButtonBuilder()
      .setCustomId(`reject_${mcname}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

    channel.send({ embeds: [embed], components: [row] });

    interaction.reply({
      content: `🎟 Ticket created: ${channel}`,
      ephemeral: true
    });
  }


  // =========================
  // APPROVE / REJECT
  // =========================
  if (interaction.isButton()) {

    // APPROVE
    if (interaction.customId.startsWith("approve_")) {

      const name = interaction.customId.split("_")[1];

      const consoleChannel = await client.channels.fetch(config.consoleChannelId);

      consoleChannel.send(`whitelist add ${name}`);

      interaction.reply(`✅ Approved & Whitelisted: ${name}`);
    }

    // REJECT
    if (interaction.customId.startsWith("reject_")) {
      const name = interaction.customId.split("_")[1];
      interaction.reply(`❌ Rejected: ${name}`);
    }
  }
});

client.login(config.token);
