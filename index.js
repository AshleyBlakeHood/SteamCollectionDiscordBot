const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();
const {Client, Collection, GatewayIntentBits } = require('discord.js');
const token = process.env.BOT_TOKEN;
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const Bree = require('bree');
const discordClient = require('./modules/discordClient');

const bree = new Bree({
	jobs: [
		{
			name: 'checker',
			timeout: '30s',
			interval: '1m',
		}
	]
});

(async () => {
	await discordClient.getInstance().login(token); 
	//await bree.start();
})();

app.get('/', (req, res) => {
    res.send('Im alive');
})
  
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})
