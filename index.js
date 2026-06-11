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
  console.log(`⚡ ShadowMc Verification Bot Online : ${client.user.tag}`);
});

// =========================
// MESSAGE COMMANDS
// =========================

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // =========================
  // SAY
  // =========================

  if (message.content.startsWith("/say ")) {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply("❌ Administrator Only.");
    }

    const text = message.content.slice(5).trim();

    if (!text) {
      return message.reply("❌ Enter a message.");
    }

    await message.delete().catch(() => {});

    await message.channel.send(text);

    return;
  }

  // =========================
  // WHITELIST PANEL
  // =========================

  if (message.content === "/whitelist setup") {

    const embed = new EmbedBuilder()

      .setColor("Gold")

      .setTitle("⚡ ShadowMc Whitelist Access")

      .setDescription(`

╔════════════════════╗
        ⚡ SHADOWMC
     WHITELIST ACCESS
╚════════════════════╝

💰 Entry Fee
> ₹45

━━━━━━━━━━━━━━━━━━

💻 JAVA EDITION

✔ Enter your normal Minecraft username.

Example:
DAREQUEEN

━━━━━━━━━━━━━━━━━━

📱 BEDROCK / PE

✔ Enter your gamertag inside double quotes.

Example:
"DAREQUEEN"

━━━━━━━━━━━━━━━━━━

💳 PAYMENT STATUS

• Confirm
• Guest
• Pending

━━━━━━━━━━━━━━━━━━

🔑 PAYMENT VERIFICATION

Enter the verification code received after payment.

⚠ Invalid verification code will instantly deny your application.

━━━━━━━━━━━━━━━━━━

🎉 Press the button below to begin verification.
`);

    const button = new ButtonBuilder()

      .setCustomId("apply")

      .setLabel("Start Verification")

      .setEmoji("⚡")

      .setStyle(ButtonStyle.Success);

    await message.channel.send({

      embeds: [embed],

      components: [
        new ActionRowBuilder()
          .addComponents(button)
      ]

    });

    return;
  }

});
// =========================
// INTERACTIONS
// =========================

client.on("interactionCreate", async (interaction) => {

  // =========================
  // START BUTTON
  // =========================

  if (
    interaction.isButton() &&
    interaction.customId === "apply"
  ) {

    // ONE ACTIVE TICKET

    const already = interaction.guild.channels.cache.find(c =>
      c.parentId === "1514652770874163472" &&
      c.name === `verify-${interaction.user.id}`
    );

    if (already) {
      return interaction.reply({
        content:
          "❌ You already have an active verification ticket.",
        ephemeral: true
      });
    }

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
      content:
        "🎮 Select your Minecraft Edition.",
      components: [row],
      ephemeral: true
    });
  }

  // =========================
  // JAVA / BEDROCK
  // =========================

  if (
    interaction.isButton() &&
    (
      interaction.customId === "java" ||
      interaction.customId === "bedrock"
    )
  ) {

    const edition =
      interaction.customId;

    const modal =
      new ModalBuilder()

        .setCustomId(
          `form_${edition}`
        )

        .setTitle(
          "ShadowMc Verification"
        );

    const mcname =
      new TextInputBuilder()

        .setCustomId("mc")

        .setLabel(
          edition === "java"
            ? "Minecraft Username"
            : 'Bedrock Username ("NAME")'
        )

        .setStyle(
          TextInputStyle.Short
        )

        .setRequired(true);

    const payment =
      new TextInputBuilder()

        .setCustomId("pay")

        .setLabel(
          "Payment Status"
        )

        .setPlaceholder(
          "Confirm / Guest / Pending"
        )

        .setStyle(
          TextInputStyle.Short
        )

        .setRequired(true);

    const code =
      new TextInputBuilder()

        .setCustomId("code")

        .setLabel(
          "Verification Code"
        )

        .setStyle(
          TextInputStyle.Short
        )

        .setRequired(true);

    modal.addComponents(

      new ActionRowBuilder()
        .addComponents(mcname),

      new ActionRowBuilder()
        .addComponents(payment),

      new ActionRowBuilder()
        .addComponents(code)

    );

    return interaction.showModal(
      modal
    );
  }

  // =========================
  // FORM SUBMIT
  // =========================

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith(
      "form_"
    )
  ) {

    const edition =
      interaction.customId
      .split("_")[1];

    const mcname =
      interaction.fields
      .getTextInputValue("mc")
      .trim();

    const payment =
      interaction.fields
      .getTextInputValue("pay")
      .trim()
      .toLowerCase();

    const code =
      interaction.fields
      .getTextInputValue("code")
      .trim();

    // PAYMENT STATUS

    const validPayment = [
      "confirm",
      "guest",
      "pending"
    ].includes(payment);

    if (!validPayment) {
      return interaction.reply({
        content:
          "❌ Invalid payment status.",
        ephemeral: true
      });
    }

    // CODE CHECK

    if (
      code !==
      config.paymentCode
    ) {
      return interaction.reply({
        content:
          "❌ Invalid payment verification code.",
        ephemeral: true
      });
    }

    // BEDROCK FORMAT

    if (
      edition === "bedrock"
    ) {

      if (
        !mcname.startsWith('"') ||
        !mcname.endsWith('"')
      ) {
        return interaction.reply({
          content:
            '❌ Bedrock username must be like "DAREQUEEN"',
          ephemeral: true
        });
      }
    }

    // CREATE TICKET

    const ticket =
      await interaction.guild
      .channels.create({

        name: `verify-${interaction.user.displayName}`

        type:
          ChannelType.GuildText,

        parent: config.ticketCategoryId,

        permissionOverwrites: [

          {
            id:
              interaction.guild.id,

            deny: [
              PermissionsBitField
              .Flags
              .ViewChannel
            ]
          },

          {
            id:
              interaction.user.id,

            allow: [
              PermissionsBitField
              .Flags
              .ViewChannel,

              PermissionsBitField
              .Flags
              .SendMessages
            ]
          },

          {
            id:
              config.adminRoleId,

            allow: [
              PermissionsBitField
              .Flags
              .ViewChannel,

              PermissionsBitField
              .Flags
              .SendMessages
            ]
          }

        ]

      });

    const embed =
      new EmbedBuilder()

      .setColor("Gold")

      .setTitle(
        "⚡ ShadowMc Verification Ticket"
      )

      .setDescription(
        "A new whitelist application has been received."
      )

      .addFields(

        {
          name:
            "👤 Applicant",

          value:
            `<@${interaction.user.id}>`
        },

        {
          name:
            "🎮 Username",

          value:
            mcname
        },

        {
          name:
            "🖥 Edition",

          value:
            edition
        },

        {
          name:
            "💳 Payment",

          value:
            payment
        },

        {
          name:
            "🔑 Code",

          value:
            "✅ Verified"
        }

      );

    const approve =
      new ButtonBuilder()

      .setCustomId(
        `approve_${interaction.user.id}`
      )

      .setLabel(
        "Approve"
      )

      .setEmoji("✅")

      .setStyle(
        ButtonStyle.Success
      );

    const reject =
      new ButtonBuilder()

      .setCustomId(
        `reject_${interaction.user.id}`
      )

      .setLabel(
        "Reject"
      )

      .setEmoji("❌")

      .setStyle(
        ButtonStyle.Danger
      );

    await ticket.send({

      content:
        `<@&${config.adminRoleId}>`,

      embeds: [embed],

      components: [

        new ActionRowBuilder()
        .addComponents(
          approve,
          reject
        )

      ]

    });

    await interaction.reply({

      content:
        `✅ Verification ticket created: ${ticket}`,

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

      // STAFF CHECK

      if (
        !interaction.member.roles.cache.has(
          config.adminRoleId
        )
      ) {
        return interaction.reply({
          content: "❌ Staff Only.",
          ephemeral: true
        });
      }

      const userId =
        interaction.customId.split("_")[1];

      const user =
        await client.users
          .fetch(userId)
          .catch(() => null);

      const embed =
        interaction.message.embeds[0];

      const mcname =
        embed.fields[1].value;

      const edition =
        embed.fields[2].value;

      // LOG CHANNEL

      const logChannel =
        await client.channels
          .fetch(config.logChannelId)
          .catch(() => null);

      // CONSOLE CHANNEL

      const consoleChannel =
        await client.channels
          .fetch(config.consoleChannelId)
          .catch(() => null);

      // =========================
      // APPROVE
      // =========================

      if (
        interaction.customId.startsWith(
          "approve_"
        )
      ) {

        // JAVA

        if (
          edition === "java"
        ) {

          if (consoleChannel) {

            await consoleChannel.send(
              `whitelist add ${mcname}`
            );

          }

        }

        // BEDROCK

        if (
          edition === "bedrock"
        ) {

          if (consoleChannel) {

            await consoleChannel.send(
              `fwhitelist add ${mcname}`
            );

          }

        }

        // DM

        if (user) {

          user.send(`

🎉━━━━━━━━━━━━━━━━━━🎉

        ⚡ SHADOWMC ⚡

━━━━━━━━━━━━━━━━━━━━

🥳 Congratulations!

Your whitelist application has been approved.

👤 Username:
${mcname}

🎮 Edition:
${edition}

✅ Status:
Whitelisted Successfully

🌍 You can now join ShadowMc and start your adventure.

❤️ Thank you for supporting the server.

⚡ Welcome to the ShadowMc Community!

🎉━━━━━━━━━━━━━━━━━━🎉

          `).catch(() => {});
        }

        // LOG

        if (logChannel) {

          logChannel.send(`

🟢 WHITELIST APPROVED

👤 Player:
${mcname}

🎮 Edition:
${edition}

👮 Approved By:
<@${interaction.user.id}>

          `);

        }

        await interaction.reply({

          content: `

✅ Application Approved!

⚡ Sending whitelist command...

📨 Sending confirmation...

🗑 Ticket will close in 3 seconds.

          `

        });

        setTimeout(() => {

          interaction.channel
            .delete()
            .catch(() => {});

        }, 3000);

      }

      // =========================
      // REJECT
      // =========================

      if (
        interaction.customId.startsWith(
          "reject_"
        )
      ) {

        if (user) {

          user.send(`

❌━━━━━━━━━━━━━━━━━━❌

       ⚡ SHADOWMC ⚡

━━━━━━━━━━━━━━━━━━━━

Your whitelist application was not approved.

If you think this was a mistake,

please contact our staff team.

Thank you for applying.

❌━━━━━━━━━━━━━━━━━━❌

          `).catch(() => {});
        }

        if (logChannel) {

          logChannel.send(`

🔴 WHITELIST REJECTED

👤 Player:
${mcname}

🎮 Edition:
${edition}

👮 Rejected By:
<@${interaction.user.id}>

          `);

        }

        await interaction.reply({

          content: `

❌ Application Rejected.

📨 User notified.

🗑 Ticket will close in 3 seconds.

          `

        });

        setTimeout(() => {

          interaction.channel
            .delete()
            .catch(() => {});

        }, 3000);

      }

    }

  }

});

client.login(process.env.TOKEN);
