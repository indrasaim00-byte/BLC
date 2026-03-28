const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "خلط-إيموجي",
    aliases: ["mix", "emojimix"],
    version: "1.0.1",
    author: "Shaon Ahmed",
    role: 0,
    shortDescription: {
      en: "Mix two emojis"
    },
    longDescription: {
      en: "Mix two emojis into one image"
    },
    category: "fun",
    guide: {
      en: "{p}mix 😄 😍"
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    if (args.length < 2) {
      return api.sendMessage(
        `❌ Wrong format!\n✅ Use: ${global.BlackBot.config.prefix}mix 😄 😍`,
        threadID,
        messageID
      );
    }

    const emoji1 = args[0];
    const emoji2 = args[1];

    const cachePath = path.join(__dirname, "cache", `emojimix_${Date.now()}.png`);

    try {
      const url = encodeURI(
        `https://web-api-delta.vercel.app/emojimix?emoji1=${emoji1}&emoji2=${emoji2}`
      );

      const res = await axios.get(url, { responseType: "arraybuffer" });
      fs.writeFileSync(cachePath, res.data);

      await api.sendMessage(
        {
          body: `✨ Emoji Mix Result`,
          attachment: fs.createReadStream(cachePath)
        },
        threadID,
        messageID
      );

      fs.unlinkSync(cachePath);

    } catch (error) {
      return api.sendMessage(
        `❌ Can't mix ${emoji1} and ${emoji2}`,
        threadID,
        messageID
      );
    }
  }
};
