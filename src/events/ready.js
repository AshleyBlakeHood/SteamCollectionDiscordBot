const cron = require("cron");
const dbAdapter = require("../db");
const axios = require("axios");
const cheerio = require("cheerio");
const { getPage } = require("./../modules/webFunctions");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`Hot dang, its ready! You are ${client.user.tag}`);
    let scheduledJob = new cron.CronJob("*/15 * * * *", async () => {
      await modChecker(client);
    });
    scheduledJob.start();
  },
};

async function modChecker(client) {
  if (!client.isReady()) {
    await client.login();
    console.log("The client isn't logged in sir");
  }

  const modDbClient = await dbAdapter.getClient();
  const mods = await modDbClient.query("SELECT * FROM mods");
  modDbClient.release();
  console.log(`Im checking all ${mods.rowCount} of the mods`);

  let usersToPing = [];
  for (const mod of mods.rows) {
    const modUrl = `${process.env.STEAM_FILE_URL}${mod.modid}`;
    const modWorkshopPage = await getPage(modUrl);
    const loadedModPage = cheerio.load(modWorkshopPage);

    const lastUpdatedDate = loadedModPage(".detailsStatRight").last().text();
    const imageUrl = loadedModPage("link[rel='image_src']").attr("href");
    const title = loadedModPage(".workshopItemTitle").text();

    //console.log(imageUrl);

    if (mod.lastupdated != lastUpdatedDate) {
      const updateDbClient = await dbAdapter.getClient();
      for (const channel of mod.channels) {
        try {
          if (mod.mentions.length > 0) {
            usersToPing = [...usersToPing, ...mod.mentions];
          }
          const modEmbed = new EmbedBuilder()
            .setColor(0x1b2838)
            .setTitle(`Mod Updated: ${title}`)
            .setURL(modUrl)
            .setImage(imageUrl)
            .addFields({ name: "Updated at: ", value: lastUpdatedDate });
          await client.channels.cache.get(channel).send({ embeds: [modEmbed] });
        } catch (error) {
          console.error(error.message);
        }
      }
      updateDbClient.query(
        `UPDATE mods SET lastupdated = '${lastUpdatedDate}' WHERE modid = '${mod.modid}'`
      );
      updateDbClient.release();
    }
  }
  usersToPing = [...new Set(usersToPing)];
  if (usersToPing.length > 0) {
    let selectString = "";
    for (const user of usersToPing) {
      selectString = `${selectString}'${user}',`;
    }
    selectString = trimQuery(selectString);
    const pingDbClient = await dbAdapter.getClient();
    await pingDbClient
      .query(
        `SELECT * FROM collectionlinks WHERE mentionid IN (${selectString});`
      )
      .then(async (data) => {
        for (const row of data.rows) {
          await client.channels.cache
            .get(row.channelid)
            .send(
              `One or more of your registered mods has been updated <@${row.mentionid}>, the mods is part of collection ${row.collectionid}`
            );
        }
      });
    pingDbClient.release();
  }
  console.log("Checker is done");
}

function trimQuery(queryString) {
  return queryString.substring(0, queryString.length - 1);
}
