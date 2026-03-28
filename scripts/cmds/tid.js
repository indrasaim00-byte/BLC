module.exports = {
	config: {
		name: "معرف-الغرفة",
    aliases: ["tid"],
		version: "1.2",
		author: "Saint",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem id nhóm chat của bạn",
			en: "View threadID of your group chat"
		},
		category: "box chat",
		guide: {
			en: "{pn}"
		}
	},

	onStart: async function ({ message, event }) {
		message.reply(event.threadID.toString());
	}
};