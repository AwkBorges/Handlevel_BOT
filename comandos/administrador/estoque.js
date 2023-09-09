const Discord = require("discord.js")
const fs = require('fs');

module.exports = {
  name: "estoque",
  description: "Mostrar contas em estoque",
  type: Discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'tipo',
      description: 'normal, aram ou prime?',
      type: Discord.ApplicationCommandOptionType.String,
      required: true,
      autocomplete: false,
    },
  ],

  run: async (client, interaction) => {

    if (!interaction.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) {
        interaction.reply({ content: `Você não possui permissão para utilzar este comando!`, ephemeral: true })
    } else {

        const userInput = interaction.options.getString('tipo');
        const userInputLower = userInput.toLowerCase();

        const estoqueNormal = '././databases/estoqueN.json';
        const estoqueAram = '././databases/estoqueA.json';

        if(userInputLower == 'normal'){

            fs.readFile(estoqueNormal, 'utf8', (err, data) => {
                if (err) {
                  console.error('Erro ao ler o arquivo JSON:', err);
                  return;
                }

                const embed = new Discord.EmbedBuilder()
                .setTitle('Estoque Normal:')
                .setColor(0xE170FF);
            
                try {
                  const jsonData = JSON.parse(data);
                              jsonData.forEach(objeto => {
                    const login = objeto.login;
                    const password = objeto.password;

                    embed.addFields({name: '💾 Login/Password', value: login+'/'+password});

                  });

                  interaction.reply({ embeds: [embed], ephemeral: true});

                } catch (err) {
                  console.error('Erro ao analisar o JSON:', err);
                }
              });
                 
        }else if(userInputLower == 'aram'){

            fs.readFile(estoqueAram, 'utf8', (err, data) => {
                if (err) {
                  console.error('Erro ao ler o arquivo JSON:', err);
                  return;
                }

                const embed = new Discord.EmbedBuilder()
                .setTitle('Estoque Aram:')
                .setColor(0xE170FF);
            
                try {
                  const jsonData = JSON.parse(data);
                              jsonData.forEach(objeto => {
                    const login = objeto.login;
                    const password = objeto.password;
                    
                    embed.addFields({name: '💾 Login/Password', value: login+'/'+password});
                  });

                  interaction.reply({ embeds: [embed], ephemeral: true});

                } catch (err) {
                  console.error('Erro ao analisar o JSON:', err);
                }
                
              });
        }else if(userInputLower == 'prime'){

            interaction.reply('está sendo feito')

        }else{
            interaction.reply('Digite apenas uma das três opções: normal / aram / prime')
        }
    }

  },
}
