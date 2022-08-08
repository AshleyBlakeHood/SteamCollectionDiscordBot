const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const dbAdapter = require('../db')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register a new collection to track')
        .addStringOption(option => 
            option.setName('collectionid')
                .setDescription('The ID of the collection you wish to track')
                .setRequired(true)),
    async execute(interaction) {

        const collectionId = interaction.options.getString('collectionid');

        await interaction.reply(`Collection ${collectionId} is being registered`);

        console.log(`Guild:${interaction.guildId} Channel:${interaction.channelId}`);

        const collectionUrl = `${process.env.STEAM_FILE_URL}${collectionId}`;

        const page = await getPage(collectionUrl);

        const $ = cheerio.load(page);
        let mods = []
        $(".collectionItemDetails").each(async (i, elem) => {mods[i] = $(elem).children('a').attr("href").split('=')[1]});

        const dependantMods = [];
        for(const mod of mods)
        {
            const modUrl = `${process.env.STEAM_FILE_URL}${mod}`;
            const modPage = await getPage(modUrl);
            const $m = cheerio.load(modPage);
            $m(".requiredItemsContainer").each(async(i, elem) => {
                const links = $m(elem).children('a');
                
                if(links.length > 0)
                {
                    for(let i = 0; i < links.length; i++)
                    {
                        dependantMods.push(links[`${i}`].attribs['href'].split('=')[1]);
                    }
                }               
            })
        }
        const uniqueDeps = [...new Set(dependantMods)];
        mods.push(...uniqueDeps);
        mods = [...new Set(mods)];
        console.log(mods);
        const client = await dbAdapter.getClient();

        await client.query(`SELECT * FROM channels WHERE ChannelID='${interaction.channelId}' `).then(data => {
            if(data.rowCount === 0)
            {
                client.query(`INSERT INTO channels (ChannelID, GuildID) VALUES ('${interaction.channelId}','${interaction.guildId}')`);
                console.log(`Added new channel reg for ${interaction.channelId}`);
            }
        });

        let modCheck = "";
        mods.forEach(modId => {
            modCheck = `${modCheck}'${modId}',`
        })
        modCheck = `(${modCheck.substring(0, modCheck.length - 1)});`

        modsToCreate = mods;

        await client.query(`SELECT * FROM mods WHERE modid IN ${modCheck}`).then(data => {
            if(data.rowCount > 0)
            {
                data.rows.forEach(element => {
                    const modIndex = modsToCreate.indexOf(element.modid);
                    if(modIndex > -1)
                    {
                        modsToCreate.splice(modIndex, 1);
                    }
                });
                
            }
        })

        if(modsToCreate.length > 0)
        {
            let inserts = "";

            modsToCreate.forEach(element => {
                inserts = `${inserts}('${element}'),`
            });
            
            inserts=`${inserts.substring(0, inserts.length - 1)};`;
    
            client.query(`INSERT INTO mods (ModID) VALUES ${inserts}`);
        }
        
        

        //console.log(existing);
        //if mod doesn't exist add it
        //if it exists but isnt in the collection remove it

        

        // shortMods.forEach(element => {
        //     client.query(`INSERT INTO Mods (ModID, ChannelID, GuildID) VALUES `);
        // });

        //await client.end();

        //console.log(interaction.client.channels.fetch(interaction.channelId).then(channel => console.log(channel.name)));

        // const channel = interaction.client.channels.fetch(interaction.channelId);

        // await interaction.client.channels.cache.get(interaction.channelId).send('Hello, Im a test');

        //channel.send('Hello, Im a test');

        interaction.followUp(`Your collection ${collectionId} has been succesfully registered`)

    },
};

function getPage(pageUrl) {
    return axios.get(pageUrl).then((res) => res.data);
}