const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const dbAdapter = require("../db");
const parse = require("date-fns/parse");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register a new collection to track")
    .addStringOption((option) =>
      option
        .setName("collectionid")
        .setDescription("The ID of the collection you wish to track")
        .setRequired(true)
    ),
  async execute(interaction) {
    const collectionId = interaction.options.getString("collectionid");

    await interaction.reply(`Collection ${collectionId} is being registered`);

    console.log(
      `Guild:${interaction.guildId} Channel:${interaction.channelId}`
    );

    const collectionUrl = `${process.env.STEAM_FILE_URL}${collectionId}`;

    const collectionWorkshopPage = await getPage(collectionUrl);

    const loadedCollectionPage = cheerio.load(collectionWorkshopPage);
    let mods = [];
    loadedCollectionPage(".collectionItemDetails").each(async (i, elem) => {
      mods[i] = loadedCollectionPage(elem)
        .children("a")
        .attr("href")
        .split("=")[1];
    });

    let modUpdatedDateLinks = [];

    let dependantMods = [];
    let dependantModLinks = [];

    for (let modIndex = 0; modIndex < mods.length; modIndex++) {
      const modUrl = `${process.env.STEAM_FILE_URL}${mods[modIndex]}`;
      const modPage = await getPage(modUrl);
      const loadedModPage = cheerio.load(modPage);

      const lastUpdatedDate = parseSteamDate(
        loadedModPage(".detailsStatRight").last().text()
      );
      modUpdatedDateLinks = [
        ...modUpdatedDateLinks,
        { modId: mods[modIndex], lastUpdated: lastUpdatedDate },
      ];

      loadedModPage(".requiredItemsContainer").each(async (i, elem) => {
        const links = loadedModPage(elem).children("a");

        if (links.length > 0) {
          for (let i = 0; i < links.length; i++) {
            const depModId = links[`${i}`].attribs["href"].split("=")[1];
            dependantMods = [...dependantMods, depModId];
            dependantModLinks = [
              ...dependantModLinks,
              { modId: mods[modIndex], depId: depModId },
            ];
          }
        }
      });
    }

    const uniqueDependancies = [...new Set(dependantMods)];
    mods = [...mods, ...uniqueDependancies];
    mods = [...new Set(mods)];

    for (const checkMod of uniqueDependancies) {
      const checkModUrl = `${process.env.STEAM_FILE_URL}${checkMod}`;
      const checkModPage = await getPage(checkModUrl);
      const $c = cheerio.load(checkModPage);
      const lastUpdatedDate = parseSteamDate(
        $c(".detailsStatRight").last().text()
      );
      modUpdatedDateLinks = [
        ...modUpdatedDateLinks,
        { modId: checkMod, lastUpdated: lastUpdatedDate },
      ];
    }

    let formattedMods = [];
    for (const mod of mods) {
      const updatedDate = modUpdatedDateLinks.find((d) => d.modId === mod);
      const modDependancies = dependantModLinks.filter((d) => d.modId === mod);
      const dependancyMap = modDependancies.map((dep) => dep.depId);
      formattedMods = [
        ...formattedMods,
        {
          modId: mod,
          lastupdated: updatedDate.lastUpdated,
          dependancies: dependancyMap,
        },
      ];
    }

    let modCheckQueryString = "";
    mods.forEach((modId) => {
      modCheckQueryString = `${modCheckQueryString}'${modId}',`;
    });
    modCheckQueryString = `(${modCheckQueryString.substring(
      0,
      modCheckQueryString.length - 1
    )});`;

    const client = await dbAdapter.getClient();

    let modsToCreate = [];
    Object.assign(modsToCreate, mods);
    let existingMods = [];

    await client
      .query(`SELECT * FROM mods WHERE modid IN ${modCheckQueryString}`)
      .then((data) => {
        if (data.rowCount > 0) {
          data.rows.forEach((element) => {
            const modIndex = modsToCreate.indexOf(element.modid);
            if (modIndex > -1) {
              modsToCreate.splice(modIndex, 1);
              existingMods = [...existingMods, element];
            }
          });
        }
      });

    if (modsToCreate.length > 0) {
      let newsModsToInsert = "";

      modsToCreate.forEach((modId) => {
        let dependancyArrayString = "{}";
        const modDependancyLinksFiltered = dependantModLinks.filter((m) => m.modId === modId);
        if (modDependancyLinksFiltered.length > 0) {
          const modDependancyMap = modDependancyLinksFiltered.map((dep) => `${dep.depId}`);
          dependancyArrayString = `{${modDependancyMap}}`;
        }

        newsModsToInsert = `${newsModsToInsert}('${modId}','${modUpdatedDateLinks
          .find((d) => d.modId === modId)
          [
            "lastUpdated"
          ].toISOString()}','${dependancyArrayString}','{${collectionId}}','{${
          interaction.channelId
        }}'),`;
      });

      newsModsToInsert = `${newsModsToInsert.substring(
        0,
        newsModsToInsert.length - 1
      )};`;

      client.query(
        `INSERT INTO mods (ModID, LastUpdated, Dependencies, Collections, Channels) VALUES ${newsModsToInsert}`
      );
    };

    if(existingMods.length > 0)
    {
        for(const mod of existingMods)
        {
            if(!mod.channels.includes(interaction.channelId))
            {
                mod.channels = [...mod.channels, interaction.channelId];
            };

            if(!mod.collections.includes(collectionId))
            {
                mod.collections = [...mod.collections, collectionId];
            };
        }

        let updateQueryString = ""
        for(const updatedMod of existingMods)
        {
            client.query(`UPDATE mods SET collections = '{${updatedMod.collections}}', channels = '{${updatedMod.channels}}' WHERE modid = '${updatedMod.modid}'`);
        }
    
    }

    interaction.followUp(
      `Your collection ${collectionId} has been succesfully registered, it contains ${mods.length} mods including dependancies`
    );
  },
};

function getPage(pageUrl) {
  return axios.get(pageUrl).then((res) => res.data);
}

function parseSteamDate(date) {
  const dateReg = new RegExp("\\d{1,2} \\w{3} \\d{4} \\d{1,2}:\\d{2}\\w{2}");
  const updateDate = date
    .split(" @")
    .join("")
    .split(",")
    .join("")
    .toUpperCase();

  if (dateReg.test(updateDate)) {
    return parse(updateDate, "d LLL y h:mmaaaaaa", new Date());
  } else {
    return parse(updateDate, "d LLL h:mmaaaaaa", new Date());
  }
}
