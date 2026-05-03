const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
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
// SETUP COMMAND
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()
      .setTitle("🔥 Sparkle SMP Whitelist System")
      .setDescription(`
🎮 Welcome to **Sparkle SMP**

To join the server, apply for whitelist below.

⚠️ **Important Rules:**
- Pocket Edition players must use "_" before name  
  Example: **_steve**
- Make sure username is correct before submitting
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
// BUTTON CLICK → MODAL
// =========================
client.on("interactionCreate", async (interaction) => {

  // APPLY BUTTON
  if (interaction.isButton() && interaction.customId === "apply_whitelist") {

    const modal = new ModalBuilder()
      .setCustomId("whitelist_form")
      .setTitle("Sparkle SMP Application Form");

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
  // MODAL SUBMIT
  // =========================
  if (interaction.isModalSubmit() && interaction.customId === "whitelist_form") {

    const mcname = interaction.fields.getTextInputValue("mcname");
    const payment = interaction.fields.getTextInputValue("payment");

    console.log("📌 MC NAME:", mcname);

    // Ticket embed
    const embed = new EmbedBuilder()
      .setTitle("📩 Whitelist Request Ticket")
      .addFields(
        { name: "🎮 Minecraft Username", value: mcname },
        { name: "💰 Payment Status", value: payment },
        { name: "👤 User", value: interaction.user.tag }
      )
      .setColor("Blue");

    const approve = new ButtonBuilder()
      .setCustomId(`approve_${interaction.user.id}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId(`reject_${interaction.user.id}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(approve, reject);

    // send ticket in same channel
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false
    });
  }


  // =========================
  // APPROVE / REJECT
  // =========================
  if (interaction.isButton()) {

    // APPROVE
    if (interaction.customId.startsWith("approve_")) {

      const userId = interaction.customId.split("_")[1];

      // fetch last message embed
      const messages = await interaction.channel.messages.fetch({ limit: 1 });
      const embed = messages.first().embeds[0];

      const mcnameField = embed.fields.find(f => f.name.includes("Minecraft"));
      const mcname = mcnameField.value;

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
