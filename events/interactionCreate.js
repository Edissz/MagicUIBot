const { handleSupportInteraction } = require('../utils/supportSystem');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    return handleSupportInteraction(interaction, client);
  }
};
