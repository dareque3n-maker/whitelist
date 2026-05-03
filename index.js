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
  console.log(`✅ Bot Online: ${client.user.tag}`);
});


// =========================
// SETUP PANEL
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()
      .setTitle("🔥 Sparkle SMP Whitelist System")
      .setDescription(`
🎮 Apply for whitelist below

⚠ Rules:
- Pocket players use "_" (Example: _steve)
`)
      .setColor("Green");

    const btn = new ButtonBuilder()
      .setCustomId("apply_whitelist")
      .setLabel("Apply Now")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(btn);

    message.channel.send({ embeds: [embed], components: [row] });
  }
});


// =========================
// INTERACTIONS
// =========================
client.on("interactionCreate", async (interaction) => {

  // APPLY BUTTON
  if (interaction.isButton() && interaction.customId === "apply_whitelist") {

    const modal = new ModalBuilder()
      .setCustomId("whitelist_form")
      .setTitle("Whitelist Application");

    const mcname = new TextInputBuilder()
      .setCustomId("mcname")
      .setLabel("Minecraft Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const payment = new TextInputBuilder()
      .setCustomId("payment")
      .setLabel("Payment Status")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(mcname),
      new ActionRowBuilder().addComponents(payment)
    );

    await interaction.showModal(modal);
  }


  // =========================
  // FORM SUBMIT → TICKET
  // =========================
  if (interaction.isModalSubmit() && interaction.customId === "whitelist_form") {

    const mcname = interaction.fields.getTextInputValue("mcname");
    const payment = interaction.fields.getTextInputValue("payment");

    // CREATE TICKET CHANNEL
    const ticket = await interaction.guild.channels.create({
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
      .addFields(
        { name: "Minecraft Username", value: mcname },
        { name: "Payment", value: payment },
        { name: "User", value: interaction.user.tag }
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

    await ticket.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: `🎟 Ticket created: ${ticket}`,
      ephemeral: true
    });
  }


  // =========================
  // APPROVE / REJECT
  // =========================
  if (interaction.isButton()) {

    const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);

    // APPROVE
    if (interaction.customId.startsWith("approve_")) {

      const userId = interaction.customId.split("_")[1];
      const mcname = interaction.message.embeds[0].fields[0].value;

      const consoleChannel = await client.channels.fetch(config.consoleChannelId);

      // send to minecraft console
      await consoleChannel.send(`whitelist add ${mcname}`);

      // DM user
      const user = await client.users.fetch(userId);
      user.send(`✅ Your whitelist request approved for: ${mcname}`);

      // log
      if (logChannel) {
        logChannel.send(`🟢 APPROVED: ${mcname} by <@${interaction.user.id}>`);
      }

      await interaction.reply("✅ Approved & Whitelisted");

      // auto delete ticket
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 3000);
    }


    // REJECT
    if (interaction.customId.startsWith("reject_")) {

      const userId = interaction.customId.split("_")[1];
      const mcname = interaction.message.embeds[0].fields[0].value;

      const user = await client.users.fetch(userId);
      user.send(`❌ Your whitelist request was rejected.`);

      if (logChannel) {
        logChannel.send(`🔴 REJECTED: ${mcname} by <@${interaction.user.id}>`);
      }

      await interaction.reply("❌ Rejected");

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 3000);
    }
  }
});

client.login(process.env.TOKEN);
