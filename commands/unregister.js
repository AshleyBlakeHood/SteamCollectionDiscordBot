const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unregister')
        .setDescription('Unregister a tracked collection'),
    async execute(interaction) {
        await interaction.reply('Collection has been unregistered');
    },
};