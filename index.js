require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const Bree = require('bree');
const discordClient = require('./modules/discordClient');

const bree = new Bree({
	jobs: [
		{
			name: 'checker',
			timeout: '1m',
			interval: '5m',
		}
	]
});

(async () => {
	await discordClient.getInstance().login(); 
	await bree.start();
})();

app.get('/', (req, res) => {
    res.send('Im alive');
})
  
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})
