module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Hot dang, its ready! You are ${client.user.tag}`);
    },
}