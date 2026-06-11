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
// MESSAGE COMMANDS
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // /say command
  if (message.content.startsWith("/say ")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ Administrator only command.");
    }

    const text = message.content.slice(5).trim();
    if (!text) return message.reply("❌ Please provide a message.");

    await message.delete().catch(() => {});
    return message.channel.send(text);
  }

  // setup panel
  if (message.content === "/whitelist setup") {
    const embed = new EmbedBuilder()
      .setTitle("⚡ ShadowMc Whitelist Gate")
      .setDescription(`
💰 Fee: **₹45**

💻 Java Edition
📱 Bedrock Edition

🔐 Enter verification code after payment
`)
      .setColor("Gold");

    const btn = new ButtonBuilder()
      .setCustomId("apply")
      .setLabel("Start Verification")
      .setStyle(ButtonStyle.Success);

    return message.channel.send({
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
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("java")
        .setLabel("Java Edition")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("bedrock")
        .setLabel("Bedrock Edition")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      content: "Select Edition",
      components: [row],
      ephemeral: true
    });
  }


  // OPEN FORM
  if (
    interaction.isButton() &&
    (interaction.customId === "java" || interaction.customId === "bedrock")
  ) {

    const modal = new ModalBuilder()
      .setCustomId(`form_${interaction.customId}`)
      .setTitle("Verification Form");

    const mcname = new TextInputBuilder()
      .setCustomId("mc")
      .setLabel("Minecraft Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const pay = new TextInputBuilder()
      .setCustomId("pay")
      .setLabel("Payment (confirm/pending/incomplete)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const code = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Verification Code")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(mcname),
      new ActionRowBuilder().addComponents(pay),
      new ActionRowBuilder().addComponents(code)
    );

    return interaction.showModal(modal);
  }


  // FORM SUBMIT
  if (interaction.isModalSubmit() && interaction.customId.startsWith("form_")) {

    const edition = interaction.customId.split("_")[1];

    const mcname = interaction.fields.getTextInputValue("mc");
    const payment = interaction.fields.getTextInputValue("pay").toLowerCase();
    const code = interaction.fields.getTextInputValue("code");

    const valid = ["confirm", "pending", "incomplete"].includes(payment);
    const codeValid = code === config.paymentCode;

    let status = "⚠ Not Confirmed";
    let color = "Orange";

    if (valid && payment === "confirm" && codeValid) {
      status = "✔ Verified";
      color = "Green";
    } else if (!codeValid) {
      status = "❌ Invalid Code";
      color = "Red";
    }


    // CREATE TICKET (FIXED)
    const ticket = await interaction.guild.channels.create({
      name: `verify-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,

      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        {
          id: config.adminRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });


    const embed = new EmbedBuilder()
      .setTitle("🔐 Verification Ticket")
      .setColor(color)
      .addFields(
        { name: "Username", value: mcname },
        { name: "Edition", value: edition },
        { name: "Payment", value: payment },
        { name: "Status", value: status }
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

    return interaction.reply({
      content: `Ticket Created: ${ticket}`,
      ephemeral: true
    });
  }


  // APPROVE / REJECT
  if (interaction.isButton()) {

    if (
      interaction.customId.startsWith("approve_") ||
      interaction.customId.startsWith("reject_")
    ) {

      if (!interaction.member.roles.cache.has(config.adminRoleId)) {
        return interaction.reply({ content: "❌ Staff only", ephemeral: true });
      }

      const logChannel = await client.channels.fetch(config.logChannelId).catch(() => null);
      const consoleChannel = await client.channels.fetch(config.consoleChannelId).catch(() => null);

      const userId = interaction.customId.split("_")[1];
      const embed = interaction.message.embeds[0];
      const mcname = embed.fields[0].value;
      const edition = embed.fields[1].value;

      const user = await client.users.fetch(userId).catch(() => null);


      // APPROVE
      if (interaction.customId.startsWith("approve_")) {

        if (edition === "java") {
          consoleChannel?.send(`whitelist add ${mcname}`);
        }

        if (edition === "bedrock") {
          consoleChannel?.send(`fwhitelist add ${mcname}`);
        }

        user?.send(`✅ You are whitelisted as ${mcname}`).catch(() => {});

        logChannel?.send(`🟢 Approved ${mcname} (${edition})`);

        await interaction.reply("✅ Approved");

        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
      }


      // REJECT
      if (interaction.customId.startsWith("reject_")) {

        user?.send(`❌ Your request was rejected`).catch(() => {});
        logChannel?.send(`🔴 Rejected ${mcname} (${edition})`);

        await interaction.reply("❌ Rejected");

        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
      }
    }
  }
});

client.login(process.env.TOKEN);
