const fs = require("node:fs");
const path = require("node:path");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord.js");
require("dotenv").config();
const { clientId, token } = {
  clientId: process.env.CLIENT_ID,
  token: process.env.DISCORD_TOKEN,
};

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);

console.log(commands);

rest
  .put(Routes.applicationCommands(clientId), { body: commands })
  .then(() => console.log("Registered app commands."))
  .catch(console.error);
