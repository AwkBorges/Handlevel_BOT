const Discord = require("discord.js")

module.exports = {
  name: "importar",
  description: "Painel de importação",
  type: Discord.ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {

    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
        interaction.reply({ content: `Você não possui permissão para utilzar este comando!`, ephemeral: true })
    } else {
        const embed = new Discord.EmbedBuilder()
        .setTitle("Adicionar contas ao banco de dados")
        .setColor(0xFFFB00)
        .setDescription("Selecione o tipo de conta que deseja importar:")
        
        const button = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
            .setCustomId("importar_normal")
            .setLabel("Handlevel Normal")
            .setEmoji("🔥")
            .setStyle(Discord.ButtonStyle.Danger),
            new Discord.ButtonBuilder()
            .setCustomId("importar_aram")
            .setLabel("Handlevel ARAM")
            .setEmoji("🧊")
            .setStyle(Discord.ButtonStyle.Primary),
            new Discord.ButtonBuilder()
            .setCustomId("importar_prime")
            .setLabel("Cápsula Prime")
            .setEmoji("🔮")
            .setStyle(Discord.ButtonStyle.Secondary),
            new Discord.ButtonBuilder()
            .setCustomId("notificar_alguem")
            .setLabel("Deu merda")
            .setEmoji("💩")
            .setStyle(Discord.ButtonStyle.Secondary),
        );

        interaction.reply({ content: `✅ Mensagem enviada!`, ephemeral: true })
        interaction.channel.send({ embeds: [embed], components: [button] })
    }


  },
}
