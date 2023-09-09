const Discord = require("discord.js")
const fs = require('fs');

module.exports = {
  name: "cupons",
  description: "Listar cupons existentes",
  type: Discord.ApplicationCommandType.ChatInput,

  run: async (client, interaction) => {

    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
        interaction.reply({ content: `Você não possui permissão para utilzar este comando!`, ephemeral: true })
    } else {

        const fs = require('fs');

        const caminhoArquivo = '././databases/cupons.txt';

        fs.readFile(caminhoArquivo, 'utf8', (err, data) => {
            if (err) {
                console.error('Erro ao ler o arquivo:', err);
                return;
            }
            
            const emoji = "🔸"
            const linhas = data.split('\n');
            const texto = linhas.map(linha => emoji + ' ' + linha).join('\n');
        
            let embed = new Discord.EmbedBuilder()
            .setTitle("CUPONS ATIVOS:")
            .setColor(0xAE00FF)
            .setDescription(texto)

            interaction.reply({ embeds: [embed], ephemeral: true })

        });

    }

  },
}
