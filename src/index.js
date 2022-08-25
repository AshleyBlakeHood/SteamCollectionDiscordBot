require("dotenv").config();
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const app = express();
const port = process.env.PORT || 8080;
const { addEvents } = require("./modules/discordClientFunctions");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
addEvents(client);
(async () => {
  await client.login();
})();

app.get("/", (req, res) => {
  res.send("Im alive");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
