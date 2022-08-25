const { SlashCommandBuilder } = require("discord.js");
const dbAdapter = require("../db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Khajit has answers if you have coin"),
  async execute(interaction) {
    await interaction.reply(
        {content: 'Testing ephemeral help', ephemeral: true}
    );
  },
};
