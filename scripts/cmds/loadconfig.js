const fs = require("fs-extra");

module.exports = {
	config: {
		name: "تحميل-الإعدادات",
		aliases: ["loadcf", "loadconfig"],
		version: "1.4",
		author: "Saint",
		countDown: 5,
		role: 2,
		description: {
			vi: "Load lại config của bot",
			en: "Reload config of bot"
		},
		category: "owner",
		guide: "{pn}"
	},

	langs: {
		vi: {
			success: "Config đã được load lại thành công"
		},
		en: {
			success: "Config has been reloaded successfully"
		}
	},

	onStart: async function ({ message, getLang }) {
		global.BlackBot.config = fs.readJsonSync(global.client.dirConfig);
		global.BlackBot.configCommands = fs.readJsonSync(global.client.dirConfigCommands);
		message.reply(getLang("success"));
	}
};