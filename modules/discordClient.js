const fs = require('node:fs');
const path = require('node:path');
const {Client, Collection, GatewayIntentBits } = require('discord.js');

class DiscordClient {
    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.addEvents();
    }

    addEvents() {
        const eventsPath = path.join(__dirname, '../events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args));
            }
        }
        
        this.client.commands = new Collection();
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for(const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            this.client.commands.set(command.data.name, command);
        }
    }

    async login() {
        await this.client.login();
    }

    async destroy() {
        await this.client.destroy();
    }
}

class DiscordClientSingleton {
    constructor() {
        throw new Error('Use singleton initiation');
    }

    static getInstance() {
        if(!DiscordClientSingleton.instance) {
            console.log('No instance exists of DiscordClient');
            DiscordClientSingleton.instance = new DiscordClient();
        }
        return (DiscordClientSingleton.instance);
    }
}

module.exports = DiscordClientSingleton;



