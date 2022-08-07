const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register a new collection to track'),
    async execute(interaction) {
        await interaction.reply('Collection has been registered');
    },
};