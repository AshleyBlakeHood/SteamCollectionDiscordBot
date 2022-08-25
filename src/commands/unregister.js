const { SlashCommandBuilder } = require("discord.js");
const dbAdapter = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unregister")
    .setDescription("Unregister a tracked collection")
    .addStringOption((option) =>
      option
        .setName("collectionid")
        .setDescription("The ID of the collection you wish to unregister")
        .setRequired(true)
    ),
  async execute(interaction) {
    const collectionId = interaction.options.getString("collectionid");
    await interaction.reply(`Collection ${collectionId} is being unregistered`);

    const modSelectQuery = `SELECT * FROM mods WHERE '${collectionId}' = ANY(collections) AND '${interaction.channel.id}' = ANY(channels)`;
    const channelCollectionLinkQuery = `SELECT * FROM collectionlinks WHERE ChannelID = '${interaction.channel.id}' AND NOT CollectionID = '${collectionId}'`;
    const collectionChannelLinkQuery = `SELECT * FROM collectionlinks WHERE CollectionID = '${collectionId}' AND NOT ChannelID = '${interaction.channel.id}'`;

    const modSelectClient = await dbAdapter.getClient();

    let channelCollectionLinks = [];
    let collectionChannelLinks = [];

    await modSelectClient.query(channelCollectionLinkQuery).then((data) => {
      channelCollectionLinks = data.rows;
    });

    await modSelectClient.query(collectionChannelLinkQuery).then((data) => {
      collectionChannelLinks = data.rows;
    });

    console.log(
      "all the collections except for the one from this interaction that has a link to this channel",
      channelCollectionLinks
    );
    console.log(
      "all the channels except the one from this interaction that has a link to this collection",
      collectionChannelLinks
    );

    let modsToUpdate = [];
    let modsToDelete = [];
    await modSelectClient.query(modSelectQuery).then((data) => {
      if (data.rowCount === 0) {
        interaction.followUp(
          "No mods have been registered for this collection in this channel"
        );
      }
      modSelectClient.release();

      console.log(
        `Removing ${data.rowCount} mods for collection ${collectionId} in channel ${interaction.channel.id}`
      );

      for (const mod of data.rows) {
        const modIndex = mod.channels.indexOf(`${interaction.channel.id}`);
        const collectionIndex = mod.collections.indexOf(`${collectionId}`);

        /*
channelCollectionLinks is all the collections except for the one from this interaction that has a link to this channel
If mod has collection id from channelCollectionLinks
        then don't remove channel
*/

        for (const link of channelCollectionLinks) {
          if (mod.collections.includes(link.collectionid)) {
            //add to list of mods that should not have THE CHANNEL THIS INTERACTION IS FROM removed
          }
        }

        for (const link of collectionChannelLinks) {
          if (mod.channels.includes(link.channelid)) {
            //add to list of mods that should not have THE COLLECTION THIS INTERACTION IS FROM removed
          }
        }
        /*
collectionChannelLinks is all the channels except the one from this interaction that has a link to this collection
If mod has channel id from collectionChannelLinks
        then dont remove collection

*/

        if (modIndex != -1 && collectionIndex != -1) {
          if (channelCollectionLinks.length > 0) {
            for (const collection in channelCollectionLinks) {
              if (!mod.collections.includes(collection)) {
                //mod.channels.splice(modIndex, 1);
                break;
              }
            }
          }

          //mod.collections.splice(collectionIndex, 1);
          //mod.channels.splice(modIndex, 1);
          if (mod.channels.length === 0) {
            modsToDelete = [...modsToDelete, mod];
          } else {
            modsToUpdate = [...modsToUpdate, mod];
          }
        }
      }
    });

    // const updateQueryString = "UPDATE ";
    // const deleteQueryString = "";

    const modUpdateClient = await dbAdapter.getClient();
    for (const mod of modsToUpdate) {
      //modUpdateClient.query(`UPDATE mods SET channels = '{${mod.channels}}' WHERE modid = '${mod.modid}'`)
    }
    //console.log('Mods to Update', modsToUpdate);
    //console.log('Mods to Delete', modsToDelete);
  },
};
