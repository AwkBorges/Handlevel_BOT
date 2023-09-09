const Discord = require("discord.js")

module.exports = {
  name: "handlevel",
  description: "Painel de vendas Handlevel",
  type: Discord.ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {

    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
        interaction.reply({ content: `Você não possui permissão para utilzar este comando!`, ephemeral: true })
    } else {
        let embed = new Discord.EmbedBuilder()
        .setTitle("Contas Handlevel Normal")
        .setColor(0xE170FF)
        .setDescription("_Fuja de contas que tenham sido upadas por programas de terceiros. Adquira uma de nossas contas handlevel agora mesmo, que nossos boosters turbinaram manualmente do level 1 ao 30. Zero risco de banimento garantido! E acredite, a garantia é vitalícia._\n\n- Level 30\n- 15.000+ EA\n- 20+ Capsulas\n- Entrega automática e imediata\n- Nenhuma EA gasta\n- Todos os dados de criação\n- Garantia vitalícia")
        .setImage('https://media.discordapp.net/attachments/1146247528514330786/1146975817763655710/2.png?width=915&height=515')
        
        const button = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
            .setCustomId("comprar_handlevel")
            .setLabel("R$ 80,00 - Comprar")
            .setStyle(Discord.ButtonStyle.Primary),
            new Discord.ButtonBuilder()
            .setCustomId("estoque_handlevel")
            .setEmoji("💾")
            .setStyle(Discord.ButtonStyle.Primary),
        );

        interaction.reply({ content: `✅ Mensagem enviada!`, ephemeral: true })
        interaction.channel.send({ embeds: [embed], components: [button] })
    }


  },
}
