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
    const collectionLinkQuery = `SELECT * FROM collectionlinks WHERE CollectionID = '${collectionId}' AND ChannelID = '${interaction.channel.id}'`;

    const modSelectClient = await dbAdapter.getClient();

    let channelCollectionLinks = [];
    let collectionChannelLinks = [];
    let collectionLink;

    await modSelectClient.query(channelCollectionLinkQuery).then((data) => {
      channelCollectionLinks = data.rows;
    });

    await modSelectClient.query(collectionChannelLinkQuery).then((data) => {
      collectionChannelLinks = data.rows;
    });

    await modSelectClient.query(collectionLinkQuery).then((data) => {
      collectionLink = data.rows[0];
    });

    let modsToUpdate = [];
    let modsToDelete = [];
    let mods = [];
    let channelsToKeep = [];
    let collectionsToKeep = [];
    let mentionsToKeep = [];
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
        for (const link of channelCollectionLinks) {
          if (mod.collections.includes(link.collectionid)) {
            channelsToKeep = [
              ...channelsToKeep,
              { modid: mod.modid, channelid: interaction.channel.id },
            ];
          }
        }

        for (const link of collectionChannelLinks) {
          if (mod.channels.includes(link.channelid)) {
            collectionsToKeep = [
              ...collectionsToKeep,
              { modid: mod.modid, collectionid: collectionId },
            ];
          }

          if (mod.mentions.includes(link.mentionid)) {
            mentionsToKeep = [
              ...mentionsToKeep,
              { modid: mod.modid, mentionid: link.mentionid },
            ];
          }
        }
      }

      for (const mod of data.rows) {
        const channelIndex = mod.channels.indexOf(`${interaction.channel.id}`);
        const collectionIndex = mod.collections.indexOf(`${collectionId}`);
        const mentionIndex = mod.mentions.indexOf(
          `${collectionLink.mentionid}`
        );

        if (!channelsToKeep.find((o) => o.modid === mod.modid)) {
          mod.channels.splice(channelIndex, 1);
        }

        if (!collectionsToKeep.find((o) => o.modid === mod.modid)) {
          mod.collections.splice(collectionIndex, 1);
        }

        if (
          mentionIndex !== -1 &&
          !mentionsToKeep.find((o) => o.modid === mod.modid)
        ) {
          mod.mentions.splice(mentionIndex, 1);
        }

        if (mod.collections.length === 0 || mod.channels.length === 0) {
          modsToDelete = [...modsToDelete, mod];
        } else {
          modsToUpdate = [...modsToUpdate, mod];
        }
      }
    });

    const modUpdateClient = await dbAdapter.getClient();
    for (const mod of modsToUpdate) {
      modUpdateClient.query(
        `UPDATE mods SET channels = '{${mod.channels}}', collections = '{${mod.collections}}', mentions = '{${mod.mentions}}' WHERE modid = '${mod.modid}'`
      );
    }

    for (const mod of modsToDelete) {
      modUpdateClient.query(`DELETE FROM mods WHERE modid = '${mod.modid}'`);
    }

    modUpdateClient.query(
      `DELETE FROM collectionlinks WHERE channelid = '${interaction.channel.id}' AND collectionid = '${collectionId}'`
    );

    modUpdateClient.release();
    interaction.followUp(`Collection ${collectionId} has been unregistered`);
  },
};
