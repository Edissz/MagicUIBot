module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Ready as ${client.user.tag}`);
  },
};

