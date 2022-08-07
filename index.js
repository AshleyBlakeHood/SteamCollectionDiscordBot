const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const {Client, Collection, GatewayIntentBits } = require('discord.js');
const token = process.env.BOT_TOKEN;
const express = require('express');
const app = express();
const port = 8080;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for(const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

client.login(token);

app.get('/', (req, res) => {
    res.send('Im alive')
})
  
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
