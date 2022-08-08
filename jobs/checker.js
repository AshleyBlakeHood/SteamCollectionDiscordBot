require('dotenv').config();
const {Client, Collection, GatewayIntentBits } = require('discord.js');
const discordClient = require('../modules/discordClient')

const client = discordClient.getInstance().client;

console.log('checking');

(async () => {
    await client.login();
    await client.channels.cache.get("1005871066012450926").send('Hello, Im a test of the cron job');
    await client.destroy();
})()

