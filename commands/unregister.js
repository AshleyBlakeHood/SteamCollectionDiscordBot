const { SlashCommandBuilder } = require("discord.js");
const dbAdapter = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unregister")
    .setDescription("Unregister a tracked collection")
    .addStringOption((option) =>
      option
        .setName("collectionid")
        .setDescription("The ID of the collection you wish to track")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.reply(`Collection ${interaction.options.getString("collectionid")} is being unregistered`);
  },
};
