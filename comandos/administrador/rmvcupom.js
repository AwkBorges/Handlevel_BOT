const Discord = require("discord.js")
const fs = require('fs');

module.exports = {
  name: "rmvcupom",
  description: "Remover um cupom existente",
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'nome',
      description: 'Insira um nome para o cupom',
      type: Discord.ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],

  run: async (client, interaction) => {

    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
        interaction.reply({ content: `Você não possui permissão para utilzar este comando!`, ephemeral: true })
    } else {

        const userInput = interaction.options.getString('nome');
        const fs = require('fs');

        const caminhoArquivo = '././databases/cupons.txt';

        fs.readFile(caminhoArquivo, 'utf8', (err, data) => {
            if (err) {
                console.error('Erro ao ler o arquivo:', err);
                return;
            }
        
            const linhas = data.split('\n');
            const novasLinhas = linhas.filter(linha => linha !== userInput);
            const novoConteudo = novasLinhas.join('\n').trim();
        
            fs.writeFile(caminhoArquivo, novoConteudo, 'utf8', (err) => {
                if (err) {
                    
                    interaction.reply({ content: `Cupom **${userInput}** não existe na lista de cupons ativos`, ephemeral: true })
                    console.error('Erro ao escrever no arquivo:', err);
                    return;
                }
        
                interaction.reply({ content: `Cupom **${userInput}** removido da lista de cupons ativos`, ephemeral: true })
            });
        });

    }

  },
}
