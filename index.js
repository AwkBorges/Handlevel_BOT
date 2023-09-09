const { Client, GatewayIntentBits, ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const axios = require('axios');
const Discord = require("discord.js");
require('dotenv').config()
const fs = require('fs');
const uuid = require('uuid');
const qrcode = require('qrcode');
const { AttachmentBuilder } = require('discord.js');
const estoquePath = './databases/estoqueN.json';
const estoqueAramPath = './databases/estoqueA.json';

const client = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

module.exports = client

client.on('interactionCreate', (interaction) => {

  if (interaction.type === Discord.InteractionType.ApplicationCommand) {

    const cmd = client.slashCommands.get(interaction.commandName);

    if (!cmd) return interaction.reply(Error);

    interaction["member"] = interaction.guild.members.cache.get(interaction.user.id);

    cmd.run(client, interaction)

  }
})

client.slashCommands = new Discord.Collection()
require('./handler')(client)
client.login(process.env.TOKEN)

async function verificarPagamentosAprovados(pagamentos) {
  const pagamentosAprovados = [];

  for (const pagamento of pagamentos) {
    try {
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${pagamento.mp_id}`, {
        headers: {
          Authorization: `Bearer ${process.env.MPTOKEN}`,
        },
      });

      if (response.data.status === 'approved') {
        pagamentosAprovados.push(pagamento.mp_id);
      }
    } catch (error) {
      console.error(`Erro ao verificar pagamento ${pagamento.mp_id}:`, error.message);
    }
  }

  return pagamentosAprovados;
}

function lerPagamentosAtivos() {
  const jsonPagAtivosData = fs.readFileSync('./databases/pagAtivos.json', 'utf8');
  return JSON.parse(jsonPagAtivosData);
}

async function main() {
  setInterval(async () => {
    const pagamentosAtivos = lerPagamentosAtivos();
    const pagamentosAprovados = await verificarPagamentosAprovados(pagamentosAtivos);

    const jsonPagAtivosData = fs.readFileSync('./databases/pagAtivos.json', 'utf8');
    const pagAtivos = JSON.parse(jsonPagAtivosData);

    for (const mp_id of pagamentosAprovados) {
      const pagamentoAprovado = pagAtivos.find((pagamento) => pagamento.mp_id === mp_id);

      if (pagamentoAprovado) {
        const { user_id, ...rest } = pagamentoAprovado;

        const dadosConta = pagAtivos.find((pagamento) => pagamento.user_id === user_id);

        if (dadosConta) {
          const user = await client.users.fetch(user_id);
          const embed = new Discord.EmbedBuilder()
            .setColor(0xF0FF00)
            .setThumbnail(user.avatarURL())
            .setDescription(`
            **Login:** ${dadosConta.login} | **Senha:** ${dadosConta.password}\n
            **Email:** ${dadosConta.email}\n
            **Nascimento:** ${dadosConta.nascimento} | **Criação:** ${dadosConta.criacao}\n
            **Informações de Pagamento:**\n
            **Identificador:** ${dadosConta.uuid}
            **Data:** ${dadosConta.data_compra}\n
            Salve suas informações e por favor nos avalie em nosso Discord.
            `)
            .setFooter({ text: `Obrigado por comprar com a ${process.env.NAME}! 💛` })
          try {

            user.send({ embeds: [embed] });

            const channel = client.channels.cache.get(dadosConta.channel_id);
            channel.send('Compra aprovada, iremos enviar sua conta na DM e excluir esse canal em 5 segundos!')

            const embedLog = new Discord.EmbedBuilder()
              .setColor(0x00E4FF)
              .setTitle(`Venda Realizada`)
              .setDescription(`**Compra:** ${dadosConta.uuid}\n**User:** ${user_id}\n **Login:** ${dadosConta.login}\n **Responsável:** ${dadosConta.responsavel}`)

            const channelLOG = client.channels.cache.get(process.env.LOGCARRINHOS)
            channelLOG.send({ embeds: [embedLog] })

            const guild = await client.guilds.fetch(process.env.GUILD);
            const member = await guild.members.fetch(user_id);
            const role = guild.roles.cache.get(process.env.CLIENTE);

            if (member && role) {
              await member.roles.add(role);
            }

            fs.appendFile(
              './databases/vendas.txt',
              `${dadosConta.uuid};${dadosConta.user_id};${dadosConta.data_compra};${dadosConta.login};${dadosConta.password};${dadosConta.valorAtualizado};${dadosConta.cupom};${dadosConta.user_email};${dadosConta.responsavel}\n`,
              (error) => {
                if (error) {
                  console.error(error);
                }
              }
            );

            setTimeout(() => {
              channel.delete()
            }, 5000);


          } catch (error) {
            console.log(error)
            const channel = client.channels.cache.get(dadosConta.channel_id);
            channel.send('Sua DM está fechada então mandaremos a mensagem por aqui, por favor, salve sua conta pois o canal será fechado em breve!')
            channel.send({ embeds: [embed] });

            const embedLog = new Discord.EmbedBuilder()
              .setColor(0x00E4FF)
              .setTitle(`Venda Realizada`)
              .setDescription(`**Compra:** ${dadosConta.uuid}\n**User:** ${user_id}\n **Login:** ${dadosConta.login}\n**Responsável:** ${dadosConta.responsavel}`)

            const channelLOG = client.channels.cache.get(process.env.LOGVENDAS)
            channelLOG.send({ embeds: [embedLog] })
            
            const guild = await client.guilds.fetch(process.env.GUILD);
            const member = await guild.members.fetch(user_id);
            const role = guild.roles.cache.get(process.env.CLIENTE);

            if (member && role) {
              await member.roles.add(role);
            }


            fs.appendFile(
              './databases/vendas.txt',
              `${dadosConta.uuid};${dadosConta.user_id};${dadosConta.data_compra};${dadosConta.login};${dadosConta.password};${dadosConta.valorAtualizado};${dadosConta.cupom};${dadosConta.user_email};${dadosConta.responsavel}\n`,
              (error) => {
                if (error) {
                  console.error(error);
                }
              }
            );

          }
        }

        const novoPagAtivos = pagAtivos.filter((pagamento) => pagamento.mp_id !== mp_id);
        fs.writeFileSync('./databases/pagAtivos.json', JSON.stringify(novoPagAtivos, null, 2));
      }
    }

  }, 5000);
}


client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
  main().catch((error) => {
    console.error('Ocorreu um erro:', error);
  });
})


client.on("interactionCreate", (interaction) => {

  if (interaction.isButton()) {
    if (interaction.customId === "close") {

      userID = interaction.user.id

      const jsonPagAtivosData = fs.readFileSync('./databases/pagAtivos.json', 'utf8');
      const originalData = JSON.parse(jsonPagAtivosData);

      const removedObject = originalData.find(obj => obj.user_id === userID);

      if (removedObject) {

        const { mp_id, user_id, user_email, uuid, data_compra, cupom, pix, channel_id, valorAtualizado, ...newObject } = removedObject;

        const updatedData = originalData.filter(obj => obj.user_id !== userID);

        const jsonEstoqueData = fs.readFileSync('./databases/estoqueN.json', 'utf8');
        const estoqueData = JSON.parse(jsonEstoqueData);
        estoqueData.push(newObject);

        fs.writeFileSync('./databases/pagAtivos.json', JSON.stringify(updatedData, null, 2));

        fs.writeFileSync('./databases/estoqueN.json', JSON.stringify(estoqueData, null, 2));

        const embedLog = new Discord.EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`Compra cancelada`)
          .setDescription(`**Compra:** ${uuid}\n**User:** ${interaction.user.username}\n**UserID:** ${userID}\n **Login:** ${newObject.login}\n**Responsável:** ${newObject.responsavel}`)

        const channelLOG = interaction.guild.channels.cache.get(process.env.LOGCARRINHOS)
        channelLOG.send({ embeds: [embedLog] })

      } else {


      }

      interaction.reply('Compra cancelada, o canal fechará em 3 segundos!')

      setTimeout(() => {
        try {
          interaction.channel.delete()
        } catch (e) {
          return;
        }
      }, 3000)

    }

    if (interaction.customId === "close_aram") {

      userID = interaction.user.id

      const jsonPagAtivosData = fs.readFileSync('./databases/pagAtivos.json', 'utf8');
      const originalData = JSON.parse(jsonPagAtivosData);

      const removedObject = originalData.find(obj => obj.user_id === userID);

      if (removedObject) {

        const { mp_id, user_id, user_email, uuid, data_compra, cupom, pix, channel_id, valorAtualizado, ...newObject } = removedObject;

        const updatedData = originalData.filter(obj => obj.user_id !== userID);

        const jsonEstoqueData = fs.readFileSync('./databases/estoqueA.json', 'utf8');
        const estoqueData = JSON.parse(jsonEstoqueData);
        estoqueData.push(newObject);

        fs.writeFileSync('./databases/pagAtivos.json', JSON.stringify(updatedData, null, 2));

        fs.writeFileSync('./databases/estoqueA.json', JSON.stringify(estoqueData, null, 2));

        const embedLog = new Discord.EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle(`Compra cancelada`)
          .setDescription(`**Compra:** ${uuid}\n**User:** ${interaction.user.username}\n**UserID:** ${userID}\n **Login:** ${newObject.login}\n**Responsável:** ${newObject.responsavel}`)

        const channelLOG = interaction.guild.channels.cache.get(process.env.LOGCARRINHOS)
        channelLOG.send({ embeds: [embedLog] })

      } else {


      }

      interaction.reply('Compra cancelada, o canal fechará em 3 segundos!')

      setTimeout(() => {
        try {
          interaction.channel.delete()
        } catch (e) {
          return;
        }
      }, 3000)

    }

    if (interaction.customId === "pix") {


      const pagAtivosData = fs.readFileSync('./databases/pagAtivos.json');
      const pagAtivos = JSON.parse(pagAtivosData);

      const userID = interaction.user.id;
      const usuarioEncontrado = pagAtivos.find((pagAtivo) => pagAtivo.user_id === userID);

      if (usuarioEncontrado) {


        const pix = usuarioEncontrado.pix;
        interaction.reply(pix)


      } else {


      }

    }

    if (interaction.customId === "help") {
      interaction.reply(`Fomos notificados! por favor aguarde e alguém com o cargo <@&${process.env.ADM}> irá lhe atender.`)
    }

    if (interaction.customId === "info") {
      interaction.reply('Funcionalidade em manutenção')
    }

    if( interaction.customId === 'notificar_alguem'){
      interaction.reply(`Socorro <@901152615864340561>`)
    }

    if (interaction.customId === "comprar_handlevel") {

      const modal = new ModalBuilder()
        .setCustomId('handlevelModal')
        .setTitle('Compra de Handlevel');

      const emailInput = new TextInputBuilder()
        .setCustomId('emailInput')
        .setLabel("Digite seu melhor email")
        .setStyle(TextInputStyle.Short);

      const cupomInput = new TextInputBuilder()
        .setCustomId('cupomInput')
        .setLabel("Possui um cupom?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const firstActionRow = new ActionRowBuilder().addComponents(emailInput);
      const secondActionRow = new ActionRowBuilder().addComponents(cupomInput);

      modal.addComponents(firstActionRow, secondActionRow)

      interaction.showModal(modal);
    }

    if(interaction.customId === "comprar_handlevel_aram"){

      const modal = new ModalBuilder()
      .setCustomId('handlevelAramModal')
      .setTitle('Compra de Handlevel');

      const emailInput = new TextInputBuilder()
        .setCustomId('emailInput')
        .setLabel("Digite seu melhor email")
        .setStyle(TextInputStyle.Short);

      const cupomInput = new TextInputBuilder()
        .setCustomId('cupomInput')
        .setLabel("Possui um cupom?")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const firstActionRow = new ActionRowBuilder().addComponents(emailInput);
      const secondActionRow = new ActionRowBuilder().addComponents(cupomInput);

      modal.addComponents(firstActionRow, secondActionRow)

      interaction.showModal(modal);

    }

    if(interaction.customId === "estoque_handlevel"){

      fs.readFile('./databases/estoqueN.json', 'utf8', (err, data) => {
        if (err) {
          console.error('Erro ao ler o arquivo:', err);
          return;
        }

        try {

          const jsonObject = JSON.parse(data);

          if (Array.isArray(jsonObject)) {
            const quantidadeDeObjetos = jsonObject.length;
            interaction.reply({ content: `Nosso estoque de contas handlevel é de {**${quantidadeDeObjetos}**}`, ephemeral: true })
          } else {
            console.log('O JSON não contém um array de objetos.');
          }
        } catch (parseError) {
          console.error('Erro ao analisar o JSON:', parseError);
        }
      });

    }

    if(interaction.customId === "estoque_handlevel_aram"){

      fs.readFile('./databases/estoqueA.json', 'utf8', (err, data) => {
        if (err) {
          console.error('Erro ao ler o arquivo:', err);
          return;
        }

        try {

          const jsonObject = JSON.parse(data);

          if (Array.isArray(jsonObject)) {
            const quantidadeDeObjetos = jsonObject.length;
            interaction.reply({ content: `Nosso estoque de contas handlevel ARAM é de {**${quantidadeDeObjetos}**}`, ephemeral: true })
          } else {
            console.log('O JSON não contém um array de objetos.');
          }
        } catch (parseError) {
          console.error('Erro ao analisar o JSON:', parseError);
        }
      });

    }

    if(interaction.customId === "importar_normal"){

      const modal = new ModalBuilder()
      .setCustomId('importarNormalModal')
      .setTitle('Importação de Handlevel Normal');

      const loginInput = new TextInputBuilder()
        .setCustomId('loginInput')
        .setLabel("Login:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const passwordInput = new TextInputBuilder()
        .setCustomId('passwordInput')
        .setLabel("Password:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const emailInput = new TextInputBuilder()
        .setCustomId('emailInput')
        .setLabel("Email:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      
      const criacaoInput = new TextInputBuilder()
        .setCustomId('criacaoInput')
        .setLabel("Criação:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const responsavelInput = new TextInputBuilder()
        .setCustomId('responsavelInput')
        .setLabel("Responsável:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  

      const firstActionRow = new ActionRowBuilder().addComponents(loginInput);
      const secondActionRow = new ActionRowBuilder().addComponents(passwordInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(emailInput);
      const fourActionRow = new ActionRowBuilder().addComponents(criacaoInput);
      const fiveActionRow = new ActionRowBuilder().addComponents(responsavelInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourActionRow, fiveActionRow)

      interaction.showModal(modal);

    }

    if(interaction.customId === "importar_aram"){

      const modal = new ModalBuilder()
      .setCustomId('importarAramModal')
      .setTitle('Importação de Handlevel Aram');

      const loginInput = new TextInputBuilder()
        .setCustomId('loginInput')
        .setLabel("Login:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const passwordInput = new TextInputBuilder()
        .setCustomId('passwordInput')
        .setLabel("Password:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const emailInput = new TextInputBuilder()
        .setCustomId('emailInput')
        .setLabel("Email:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      
      const criacaoInput = new TextInputBuilder()
        .setCustomId('criacaoInput')
        .setLabel("Criação:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const responsavelInput = new TextInputBuilder()
        .setCustomId('responsavelInput')
        .setLabel("Responsável:")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
  

      const firstActionRow = new ActionRowBuilder().addComponents(loginInput);
      const secondActionRow = new ActionRowBuilder().addComponents(passwordInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(emailInput);
      const fourActionRow = new ActionRowBuilder().addComponents(criacaoInput);
      const fiveActionRow = new ActionRowBuilder().addComponents(responsavelInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourActionRow, fiveActionRow)

      interaction.showModal(modal);

    }

  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'handlevelModal') {

      const user_email = interaction.fields.getTextInputValue('emailInput');
      const cupom = interaction.fields.getTextInputValue('cupomInput');
      const cupons = fs.readFileSync('./databases/cupons.txt', 'utf8').split('\n');

      async function processHandlevelPurchase() {

        function readEstoque(filePath) {
          return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                reject(err);
                return;
              }

              const jsonData = JSON.parse(data);
              resolve(jsonData);
            });
          });
        }

        const estoqueData = await readEstoque('./databases/estoqueN.json')
        const currentDate = new Date();

        const firstAccount = estoqueData[0];

        const modifiedFirstAccount = {
          uuid: uuid.v4(),
          data_compra: `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`,
          user_id: interaction.user.id,
          user_email: user_email,
          ...firstAccount
        };

        const channel_name = `🥇﹒handlevel﹒${interaction.user.username}`;
        const text_category_id = process.env.CARRINHO

        if (!interaction.guild.channels.cache.get(text_category_id)) text_category_id = null;

        if (interaction.guild.channels.cache.find(c => c.name === channel_name)) {
          interaction.reply({ content: ` Você já possui uma compra aberta em ${interaction.guild.channels.cache.find(c => c.name === channel_name)}, por favor, realize uma compra de cada vez!`, ephemeral: true })
        } else {

          const index = 0;
          if (index !== -1 && index < estoqueData.length) {

            const removedAccount = estoqueData.splice(index, 1)[0];
            fs.writeFileSync('./databases/estoqueN.json', JSON.stringify(estoqueData, null, 2));

          } else {

            interaction.reply({ content: `Atualmente estamos sem contas no estoque`, ephemeral: true });
            return;

          }

          const valor = process.env.NORMALPRICE
          const transactionAmount = cupom !== null && cupons.includes(cupom) ? parseFloat((valor - valor * 0.1).toFixed(2)) : valor;

          const buyerName = 'Nome do comprador';
          const buyerEmail = 'email@example.com';
          const buyerCPF = '47161952441';

          const accessToken = process.env.MPTOKEN

          const apiUrl = 'https://api.mercadopago.com/v1/payments';

          const paymentData = {
            transaction_amount: Number(transactionAmount),
            description: `Handlevel Normal`,
            payment_method_id: 'pix',
            payer: {
              email: buyerEmail,
              identification: {
                type: 'CPF',
                number: buyerCPF
              },
              first_name: buyerName
            }
          };

          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          };

          fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(paymentData)
          })
            .then(response => response.json())
            .then(data => {

              const paymentID = data.id
              const pixKey = data.point_of_interaction.transaction_data.qr_code;
              const ticketUrl = data.point_of_interaction.transaction_data.ticket_url;

              async function generateQRCode(pixKey) {
                try {
                  const qrCodeDataUrl = await qrcode.toDataURL(pixKey);
                  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
                  const qrCodeBuffer = Buffer.from(base64Data, 'base64');

                  fs.writeFileSync('./databases/qrcode.png', qrCodeBuffer);

                } catch (err) {
                  console.error('Erro ao gerar o QR code:', err);
                }
              }

              generateQRCode(pixKey)
              const file = new AttachmentBuilder('./databases/qrcode.png');
              const { user_id, uuid, data_compra, login, password, email, nascimento, criacao, valor, responsavel } = modifiedFirstAccount;
              const pagAtivosData = JSON.parse(fs.readFileSync('./databases/pagAtivos.json', 'utf8'));

              const maskedLogin = login.substring(0, 4) + '&&'.repeat(login.length - 4);
              const valorAtualizado = Number(transactionAmount)

              interaction.guild.channels.create({
                name: channel_name,
                type: Discord.ChannelType.GuildText,
                parent: text_category_id,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [
                      Discord.PermissionFlagsBits.ViewChannel
                    ]
                  },
                  {
                    id: interaction.user.id,
                    allow: [
                      Discord.PermissionFlagsBits.ViewChannel,
                      Discord.PermissionFlagsBits.SendMessages,
                      Discord.PermissionFlagsBits.AttachFiles,
                      Discord.PermissionFlagsBits.EmbedLinks,
                      Discord.PermissionFlagsBits.AddReactions
                    ]
                  }
                ]
              }).then((ch) => {

                const channelID = ch.id;

                pagAtivosData.push({

                  mp_id: paymentID,
                  user_id: user_id,
                  user_email: user_email,
                  uuid: uuid,
                  data_compra: data_compra,
                  cupom: cupom,
                  pix: pixKey,
                  channel_id: channelID,
                  valor: valor,
                  valorAtualizado: valorAtualizado,
                  login: login,
                  password: password,
                  email: email,
                  nascimento: nascimento,
                  criacao: criacao,
                  responsavel: responsavel,

                });


                fs.writeFileSync('./databases/pagAtivos.json', JSON.stringify(pagAtivosData, null, 2));

                const embed = new Discord.EmbedBuilder()
                  .setColor(0xFFFF00)
                  .setTitle(`ID: ${uuid}`)
                  .setDescription(`**Login:** ${maskedLogin}\n **Valor:** R$ ${valorAtualizado}\n\n
                🔒 Cancelar Compra\n
                💵 Código PIX copia e cola\n
                📞 Peça ajuda\n
                ❔ F.A.Q\n
                `)
                  .setThumbnail('attachment://qrcode.png');
                const button = new Discord.ActionRowBuilder().addComponents(
                  new Discord.ButtonBuilder()
                    .setCustomId("close")
                    .setEmoji("🔒")
                    .setStyle(Discord.ButtonStyle.Danger),
                  new Discord.ButtonBuilder()
                    .setCustomId("pix")
                    .setEmoji("💵")
                    .setStyle(Discord.ButtonStyle.Success),
                  new Discord.ButtonBuilder()
                    .setCustomId("help")
                    .setEmoji("📞")
                    .setStyle(Discord.ButtonStyle.Primary),
                  new Discord.ButtonBuilder()
                    .setCustomId("info")
                    .setEmoji("❔")
                    .setStyle(Discord.ButtonStyle.Secondary),
                  new Discord.ButtonBuilder()
                    .setLabel('PIX Ticket')
                    .setURL(`${ticketUrl}`)
                    .setStyle(Discord.ButtonStyle.Link),
                );

                ch.send({ embeds: [embed], components: [button], files: [file] })
                interaction.reply({ content: `Sua compra foi aberta no canal: ${ch}`, ephemeral: true })

              })

              const embedLog = new Discord.EmbedBuilder()
                .setColor(0xA2FF00)
                .setTitle(`Compra aberta`)
                .setDescription(`**Compra:** ${uuid}\n**User:** ${interaction.user.username}\n **UserID:** ${interaction.user.id}\n **Login:** ${login}\n **Responsável:** ${responsavel}`)

              const channelLOG = interaction.guild.channels.cache.get(process.env.LOGCARRINHOS)
              channelLOG.send({ embeds: [embedLog] })

            })
            .catch(error => {
              interaction.reply({ content: `Erro ao criar sua compra, por favor abra um ticket de suporte.`, ephemeral: true })
              console.error('Erro ao criar a preferência de pagamento:', error);
            });



        }

      }

      processHandlevelPurchase()

    }

    if(interaction.customId === 'handlevelAramModal'){

      const user_email = interaction.fields.getTextInputValue('emailInput');
      const cupom = interaction.fields.getTextInputValue('cupomInput');
      const cupons = fs.readFileSync('./databases/cupons.txt', 'utf8').split('\n');

      async function processHandlevelAramPurchase() {

        function readEstoque(filePath) {
          return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
              if (err) {
                reject(err);
                return;
              }

              const jsonData = JSON.parse(data);
              resolve(jsonData);
            });
          });
        }

        const estoqueData = await readEstoque('./databases/estoqueA.json')
        const currentDate = new Date();

        const firstAccount = estoqueData[0];

        const modifiedFirstAccount = {
          uuid: uuid.v4(),
          data_compra: `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`,
          user_id: interaction.user.id,
          user_email: user_email,
          ...firstAccount
        };

        const channel_name = `❄️﹒handlevel﹒${interaction.user.username}`;
        const text_category_id = process.env.CARRINHO

        if (!interaction.guild.channels.cache.get(text_category_id)) text_category_id = null;

        if (interaction.guild.channels.cache.find(c => c.name === channel_name)) {
          interaction.reply({ content: ` Você já possui uma compra aberta em ${interaction.guild.channels.cache.find(c => c.name === channel_name)}, por favor, realize uma compra de cada vez!`, ephemeral: true })
        } else {

          const index = 0;
          if (index !== -1 && index < estoqueData.length) {

            const removedAccount = estoqueData.splice(index, 1)[0];
            fs.writeFileSync('./databases/estoqueA.json', JSON.stringify(estoqueData, null, 2));

          } else {

            interaction.reply({ content: `Atualmente estamos sem contas no estoque`, ephemeral: true });
            return;

          }

          const valor = process.env.ARAMPRICE
          const transactionAmount = cupom !== null && cupons.includes(cupom) ? parseFloat((valor - valor * 0.1).toFixed(2)) : valor;

          const buyerName = 'Nome do comprador';
          const buyerEmail = 'email@example.com';
          const buyerCPF = '47161952441';

          const accessToken = process.env.MPTOKEN

          const apiUrl = 'https://api.mercadopago.com/v1/payments';

          const paymentData = {
            transaction_amount: Number(transactionAmount),
            description: `Handlevel ARAM`,
            payment_method_id: 'pix',
            payer: {
              email: buyerEmail,
              identification: {
                type: 'CPF',
                number: buyerCPF
              },
              first_name: buyerName
            }
          };

          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          };

          fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(paymentData)
          })
            .then(response => response.json())
            .then(data => {

              const paymentID = data.id
              const pixKey = data.point_of_interaction.transaction_data.qr_code;
              const ticketUrl = data.point_of_interaction.transaction_data.ticket_url;

              async function generateQRCode(pixKey) {
                try {
                  const qrCodeDataUrl = await qrcode.toDataURL(pixKey);
                  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
                  const qrCodeBuffer = Buffer.from(base64Data, 'base64');

                  fs.writeFileSync('./databases/qrcode.png', qrCodeBuffer);

                } catch (err) {
                  console.error('Erro ao gerar o QR code:', err);
                }
              }

              generateQRCode(pixKey)
              const file = new AttachmentBuilder('./databases/qrcode.png');
              const { user_id, uuid, data_compra, login, password, email, nascimento, criacao, valor, responsavel } = modifiedFirstAccount;
              const pagAtivosData = JSON.parse(fs.readFileSync('./databases/pagAtivos.json', 'utf8'));

              const maskedLogin = login.substring(0, 4) + '&&'.repeat(login.length - 4);
              const valorAtualizado = Number(transactionAmount)

              interaction.guild.channels.create({
                name: channel_name,
                type: Discord.ChannelType.GuildText,
                parent: text_category_id,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [
                      Discord.PermissionFlagsBits.ViewChannel
                    ]
                  },
                  {
                    id: interaction.user.id,
                    allow: [
                      Discord.PermissionFlagsBits.ViewChannel,
                      Discord.PermissionFlagsBits.SendMessages,
                      Discord.PermissionFlagsBits.AttachFiles,
                      Discord.PermissionFlagsBits.EmbedLinks,
                      Discord.PermissionFlagsBits.AddReactions
                    ]
                  }
                ]
              }).then((ch) => {

                const channelID = ch.id;

                pagAtivosData.push({

                  mp_id: paymentID,
                  user_id: user_id,
                  user_email: user_email,
                  uuid: uuid,
                  data_compra: data_compra,
                  cupom: cupom,
                  pix: pixKey,
                  channel_id: channelID,
                  valor: valor,
                  valorAtualizado: valorAtualizado,
                  login: login,
                  password: password,
                  email: email,
                  nascimento: nascimento,
                  criacao: criacao,
                  responsavel: responsavel,

                });


                fs.writeFileSync('./databases/pagAtivos.json', JSON.stringify(pagAtivosData, null, 2));

                const embed = new Discord.EmbedBuilder()
                  .setColor(0xFFFF00)
                  .setTitle(`ID: ${uuid}`)
                  .setDescription(`**Login:** ${maskedLogin}\n **Valor:** R$ ${valorAtualizado}\n\n
                🔒 Cancelar Compra\n
                💵 Código PIX copia e cola\n
                📞 Peça ajuda\n
                ❔ F.A.Q\n
                `)
                  .setThumbnail('attachment://qrcode.png');
                const button = new Discord.ActionRowBuilder().addComponents(
                  new Discord.ButtonBuilder()
                    .setCustomId("close_aram")
                    .setEmoji("🔒")
                    .setStyle(Discord.ButtonStyle.Danger),
                  new Discord.ButtonBuilder()
                    .setCustomId("pix")
                    .setEmoji("💵")
                    .setStyle(Discord.ButtonStyle.Success),
                  new Discord.ButtonBuilder()
                    .setCustomId("help")
                    .setEmoji("📞")
                    .setStyle(Discord.ButtonStyle.Primary),
                  new Discord.ButtonBuilder()
                    .setCustomId("info")
                    .setEmoji("❔")
                    .setStyle(Discord.ButtonStyle.Secondary),
                  new Discord.ButtonBuilder()
                    .setLabel('PIX Ticket')
                    .setURL(`${ticketUrl}`)
                    .setStyle(Discord.ButtonStyle.Link),
                );

                ch.send({ embeds: [embed], components: [button], files: [file] })
                interaction.reply({ content: `Sua compra foi aberta no canal: ${ch}`, ephemeral: true })

              })

              const embedLog = new Discord.EmbedBuilder()
                .setColor(0xA2FF00)
                .setTitle(`Compra aberta`)
                .setDescription(`**Compra:** ${uuid}\n**User:** ${interaction.user.username}\n **UserID:** ${interaction.user.id}\n **Login:** ${login}\n **Responsável:** ${responsavel}`)

              const channelLOG = interaction.guild.channels.cache.get(process.env.LOGCARRINHOS)
              channelLOG.send({ embeds: [embedLog] })

            })
            .catch(error => {
              interaction.reply({ content: `Erro ao criar sua compra, por favor abra um ticket de suporte.`, ephemeral: true })
              console.error('Erro ao criar a preferência de pagamento:', error);
            });



        }

      }

      processHandlevelAramPurchase()

    }

    if(interaction.customId === 'importarNormalModal'){

      let existingData = [];

      try {
        existingData = JSON.parse(fs.readFileSync(estoquePath));
      } catch (error) {
        console.error('Falha ao ler o arquivo JSON do estoque');
        throw error;
      }

      const login = interaction.fields.getTextInputValue('loginInput');
      const password = interaction.fields.getTextInputValue('passwordInput');
      const email = interaction.fields.getTextInputValue('emailInput');
      const criacao = interaction.fields.getTextInputValue('criacaoInput');
      const responsavel = interaction.fields.getTextInputValue('responsavelInput');

      existingData.push({
        "login": login,
        "password": password,
        "email": email,
        "nascimento": "12_06_1998",
        "criacao": criacao,
        "responsavel": responsavel,
        "valor": Number(process.env.NORMALPRICE)
      })

      console.log('Dados existentes:', existingData);

      const updatedData = JSON.stringify(existingData);

      fs.writeFile(estoquePath, updatedData, (error) => {
        if (error) {
          console.error('Falha ao gravar o arquivo JSON do estoque');
          throw error;
        }
          interaction.reply({ content: `Conta **${login}** adicionada ao estoque Normal`, ephemeral: true })
      });
      

    }

    if(interaction.customId === 'importarAramModal'){

      let existingData = [];

      try {
        existingData = JSON.parse(fs.readFileSync(estoqueAramPath));
      } catch (error) {
        console.error('Falha ao ler o arquivo JSON do estoque');
        throw error;
      }

      const login = interaction.fields.getTextInputValue('loginInput');
      const password = interaction.fields.getTextInputValue('passwordInput');
      const email = interaction.fields.getTextInputValue('emailInput');
      const criacao = interaction.fields.getTextInputValue('criacaoInput');
      const responsavel = interaction.fields.getTextInputValue('responsavelInput');

      existingData.push({
        "login": login,
        "password": password,
        "email": email,
        "nascimento": "12_06_1998",
        "criacao": criacao,
        "responsavel": responsavel,
        "valor": Number(process.env.ARAMPRICE)
      })

      console.log('Dados existentes:', existingData);

      const updatedData = JSON.stringify(existingData);

      fs.writeFile(estoqueAramPath, updatedData, (error) => {
        if (error) {
          console.error('Falha ao gravar o arquivo JSON do estoque');
          throw error;
        }
          interaction.reply({ content: `Conta **${login}** adicionada ao estoque Aram`, ephemeral: true })
      });
      

    }
  }

})

