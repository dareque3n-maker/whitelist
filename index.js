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
      .setTitle("⚡ ShadowMc Whitelist System")
      .setDescription(`
💰 Fee: **₹45**

---

💻 **Java Edition**
✔ Username format: DAREQUEEN
✔ Direct username apply

---

📱 **Bedrock / PE**
✔ Username format: "DAREQUEEN"
✔ Quotes optional but recommended

---

⚠ Enter correct payment code after payment
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
// INTERACTION
// =========================
client.on("interactionCreate", async (interaction) => {

  // APPLY
  if (interaction.isButton() && interaction.customId === "apply") {

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("java").setLabel("Java").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("bedrock").setLabel("Bedrock").setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      content: "Choose Edition 👇",
      components: [row],
      ephemeral: true
    });
  }


  // MODAL OPEN
  if (interaction.isButton() && (interaction.customId === "java" || interaction.customId === "bedrock")) {

    const modal = new ModalBuilder()
      .setCustomId(`form_${interaction.customId}`)
      .setTitle("Whitelist Form");

    const mc = new TextInputBuilder()
      .setCustomId("mc")
      .setLabel("Minecraft Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const pay = new TextInputBuilder()
      .setCustomId("pay")
      .setLabel("Payment Status (confirm/pending/incomplete)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const code = new TextInputBuilder()
      .setCustomId("code")
      .setLabel("Verification Code")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(mc),
      new ActionRowBuilder().addComponents(pay),
      new ActionRowBuilder().addComponents(code)
    );

    return interaction.showModal(modal);
  }


  // FORM SUBMIT
  if (interaction.isModalSubmit() && interaction.customId.startsWith("form_")) {

    const edition = interaction.customId.split("_")[1];

    let mcname = interaction.fields.getTextInputValue("mc").trim();
    const payment = interaction.fields.getTextInputValue("pay").toLowerCase();
    const code = interaction.fields.getTextInputValue("code").trim();

    const valid = ["confirm", "pending", "incomplete"].includes(payment);
    const codeValid = code === config.paymentCode;

    let status = "⚠ Not Verified";
    let color = "Orange";

    if (valid && payment === "confirm" && codeValid) {
      status = "✔ Verified";
      color = "Green";
    } else if (!codeValid) {
      status = "❌ Invalid Code";
      color = "Red";
    }


    // BEDROCK FORMAT FIX
    if (edition === "bedrock") {
      mcname = `"${mcname}"`;
    }


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
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });


    const embed = new EmbedBuilder()
      .setTitle("🔐 Whitelist Ticket")
      .setColor(color)
      .addFields(
        { name: "Username", value: mcname },
        { name: "Edition", value: edition },
        { name: "Payment", value: "₹45" },
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
      content: `🎟 Ticket Created`,
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

      const userId = interaction.customId.split("_")[1];
      const embed = interaction.message.embeds[0];
      const mcname = embed.fields[0].value;
      const edition = embed.fields[1].value;

      const user = await client.users.fetch(userId).catch(() => null);


      // APPROVE MESSAGE (PREMIUM)
      if (interaction.customId.startsWith("approve_")) {

        if (edition === "java") {
          consoleChannel?.send(`whitelist add ${mcname}`);
        }

        if (edition === "bedrock") {
          consoleChannel?.send(`fwhitelist add ${mcname}`);
        }

        user?.send(
`🎉 WHITELIST APPROVED!

👤 Username: ${mcname}
🖥 Edition: ${edition}
💰 Status: VERIFIED
⚡ You can now join the server

Welcome to ShadowMc 🚀`
        ).catch(() => {});

        return interaction.reply("✅ Approved");
      }


      // REJECT
      if (interaction.customId.startsWith("reject_")) {

        user?.send(`❌ Your whitelist request was rejected`).catch(() => {});
        return interaction.reply("❌ Rejected");
      }
    }
  }
});

client.login(process.env.TOKEN);
