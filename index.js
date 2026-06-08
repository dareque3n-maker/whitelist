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
// WHITELIST PANEL
// =========================
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()
      .setTitle("⚡ ShadowMc Whitelist Gate")
      .setDescription(`
💰 Fee: **₹35**

⚠ Rules:

💻 Java Edition:
✔ Example: DAREQUE3N

📱 Bedrock / Pocket Edition:
• Join the server once before applying

✔ Example: "DAREQUE3N"

📌 Payment Status:
Confirm / Pending / Incomplete

🔐 Enter the verification code given after payment
`)
      .setColor("Gold");

    const btn = new ButtonBuilder()
      .setCustomId("apply")
      .setLabel("Start Verification")
      .setStyle(ButtonStyle.Success);

    await message.channel.send({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(btn)
      ]
    });
  }
});


// =========================
// INTERACTIONS
// =========================
client.on("interactionCreate", async (interaction) => {

  // =========================
  // APPLY BUTTON
  // =========================
  if (
    interaction.isButton() &&
    interaction.customId === "apply"
  ) {

    const row = new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId("java")
        .setLabel("Java Edition")
        .setEmoji("💻")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("bedrock")
        .setLabel("Bedrock / PE")
        .setEmoji("📱")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      content: "🎮 Select your Minecraft Edition",
      components: [row],
      ephemeral: true
    });
  }


  // =========================
  // JAVA / BEDROCK BUTTON
  // =========================
  if (
    interaction.isButton() &&
    (
      interaction.customId === "java" ||
      interaction.customId === "bedrock"
    )
  ) {

    const edition = interaction.customId;

    const modal = new ModalBuilder()
      .setCustomId(`form_${edition}`)
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
  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith("form_")
  ) {

    const edition = interaction.customId.split("_")[1];

    const mcname = interaction.fields
      .getTextInputValue("mc")
      .trim();

    const payment = interaction.fields
      .getTextInputValue("pay")
      .toLowerCase();

    const code = interaction.fields
      .getTextInputValue("code")
      .trim();

    const validPayment = [
      "confirm",
      "pending",
      "incomplete"
    ].includes(payment);

    const codeValid = code === config.paymentCode;

    let status = "⚠ Payment Not Confirmed";
    let color = "Orange";

    if (
      validPayment &&
      payment === "confirm" &&
      codeValid
    ) {

      status = "✔ Payment Verified (₹35 Confirmed)";
      color = "Green";

    } else if (!codeValid) {

      status = "❌ Invalid Verification Code";
      color = "Red";
    }


    // =========================
    // CREATE TICKET
    // =========================
    const ticket = await interaction.guild.channels.create({
      name: `verify-${interaction.user.username}`,
      type: ChannelType.GuildText,

      permissionOverwrites: [

        {
          id: interaction.guild.id,
          deny: [
            PermissionsBitField.Flags.ViewChannel
          ]
        },

        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });


    // =========================
    // EMBED
    // =========================
    const embed = new EmbedBuilder()
      .setTitle("🔐 ShadowMc Verification Ticket")
      .setColor(color)
      .addFields(

        {
          name: "🎮 Username",
          value: mcname
        },

        {
          name: "🖥 Edition",
          value: edition
        },

        {
          name: "💰 Payment",
          value: payment
        },

        {
          name: "🔑 Code",
          value: codeValid
            ? "✔ Correct"
            : "❌ Wrong"
        },

        {
          name: "📌 Status",
          value: status
        }
      );


    // =========================
    // STAFF BUTTONS
    // =========================
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
      components: [
        new ActionRowBuilder().addComponents(
          approve,
          reject
        )
      ]
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

    if (
      interaction.customId.startsWith("approve_") ||
      interaction.customId.startsWith("reject_")
    ) {

      if (
        !interaction.member.roles.cache.has(
          config.adminRoleId
        )
      ) {

        return interaction.reply({
          content: "❌ Staff only",
          ephemeral: true
        });
      }

      const logChannel = await client.channels
        .fetch(config.logChannelId)
        .catch(() => null);

      const consoleChannel = await client.channels
        .fetch(config.consoleChannelId)
        .catch(() => null);

      const userId =
        interaction.customId.split("_")[1];

      const embed =
        interaction.message.embeds[0];

      const mcname = embed.fields[0].value;
      const edition = embed.fields[1].value;

      const user = await client.users
        .fetch(userId)
        .catch(() => null);


      // =========================
      // APPROVE
      // =========================
      if (
        interaction.customId.startsWith("approve_")
      ) {

        // JAVA
        if (edition === "java") {

          if (consoleChannel) {
            await consoleChannel.send(
              `whitelist add ${mcname}`
            );
          }
        }

        // BEDROCK
        if (edition === "bedrock") {

          if (consoleChannel) {
            await consoleChannel.send(
              `fwhitelist add ${mcname}`
            );
          }
        }

        // DM USER
        if (user) {

          user.send(
            `🎉 You are whitelisted on ShadowMc as **${mcname}**`
          ).catch(() => {});
        }

        // LOG
        if (logChannel) {

          logChannel.send(
            `🟢 Approved: ${mcname} (${edition}) by <@${interaction.user.id}>`
          );
        }

        await interaction.reply({
          content: "✅ Approved"
        });

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 3000);
      }


      // =========================
      // REJECT
      // =========================
      if (
        interaction.customId.startsWith("reject_")
      ) {

        if (user) {

          user.send(
            `❌ Your whitelist request was rejected`
          ).catch(() => {});
        }

        if (logChannel) {

          logChannel.send(
            `🔴 Rejected: ${mcname} (${edition}) by <@${interaction.user.id}>`
          );
        }

        await interaction.reply({
          content: "❌ Rejected"
        });

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 3000);
      }
    }
  }
});

client.login(process.env.TOKEN);
