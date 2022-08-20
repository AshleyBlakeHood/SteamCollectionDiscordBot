require('dotenv').config();
const {Client, Collection, GatewayIntentBits } = require('discord.js');
const discordClient = require('./../modules/discordClient');
const dbAdapter = require("../db");
const axios = require("axios");
const cheerio = require("cheerio");
const parse = require("date-fns/parse");

const client = discordClient.getInstance().client;

function getPage(pageUrl) {
    return axios.get(pageUrl, {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
        }
    }).then((res) => res.data);
}

(async () => {
    //await discordClient.getInstance().login();
    const modDbClient = await dbAdapter.getClient();
    if(!client.isReady())
    {
        await client.login();
        console.log("The client isn't logged in sir");
    }

    const mods = await modDbClient.query("SELECT * FROM mods");
    modDbClient.release();
    console.log(`Im checking all ${mods.rowCount} of the mods`);

    for(const mod of mods.rows) {
        const modUrl = `${process.env.STEAM_FILE_URL}${mod.modid}`;
        const modWorkshopPage = await getPage(modUrl);
        const loadedModPage = cheerio.load(modWorkshopPage);

        const lastUpdatedDate = loadedModPage(".detailsStatRight").last().text();

        if(mod.lastupdated != lastUpdatedDate)
        {
            const updateDbClient = await dbAdapter.getClient();
            for(const channel of mod.channels){
                try{
                    await client.channels.cache.get(channel).send(`The following mod has been updated ${modUrl}`);
                } catch (error) {
                    console.error(error.message);
                    process.exit(0);
                }
                
            }
            //updateDbClient.query(`UPDATE mods SET lastupdated = '${lastUpdatedDate}' WHERE modid = '${mod.modid}'`);
            updateDbClient.release();
        }
    }
    process.exit(0);
})()

