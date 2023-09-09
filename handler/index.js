const fs = require("fs");

module.exports = async (client) => {
  const SlashsArray = [];

  fs.readdir(`./comandos`, (error, folder) => {
    if (error) {
      console.error(error);
      return;
    }

    folder.forEach(subfolder => {
      fs.readdir(`./comandos/${subfolder}/`, (error, files) => {
        if (error) {
          console.error(error);
          return;
        }

        files.forEach(file => { 
          if (!file.endsWith('.js')) return;
          const command = require(`../comandos/${subfolder}/${file}`);
          if (!command?.name) return;
          client.slashCommands.set(command?.name, command);
          SlashsArray.push(command);
        });
      });
    });
  });

  client.on("ready", async () => {
    client.guilds.cache.forEach(guild => guild.commands.set(SlashsArray));
  });
};
