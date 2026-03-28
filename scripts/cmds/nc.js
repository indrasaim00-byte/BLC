const axios = require("axios");
const fs = require("fs");
const path = require("path");

const apikey = "66e0cfbb-62b8-4829-90c7-c78cacc72ae2";

module.exports = {
  config: {
    name: "شبكة",
    aliases: ["nc"],
    version: "1.2",
    role: 2,
    author: "nexo_here",
    category: "fun",
    shortDescription: "Send random nude cosplay by page",
    longDescription: "Get a cosplay profile with 3 images; use page like: {pn} 2",
    guide: "{pn} [pageNumber]"
  },

  onStart: async function ({ api, event, args }) {
    try {
      const page = parseInt(args[0]) || 1;
      if (page < 1) return api.sendMessage("❌ Invalid page number.", event.threadID, event.messageID);

      const apiUrl = `https://kaiz-apis.gleeze.com/api/nude-cosplay?page=${page}&limit=1&imageLimit=3&apikey=${apikey}`;
      const res = await axios.get(apiUrl);
      const result = res.data?.results?.[0];

      if (!result || !result.imageUrls || result.imageUrls.length === 0) {
        return api.sendMessage("❌ No results found on this page.", event.threadID, event.messageID);
      }

      const imgPaths = [];

      for (let i = 0; i < result.imageUrls.length; i++) {
        const imgURL = result.imageUrls[i];
        const imgName = `nc_${Date.now()}_${i}.jpg`;
        const imgPath = path.join(__dirname, "tmp", imgName);

        const response = await axios({
          url: imgURL,
          method: "GET",
          responseType: "stream"
        });

        const writer = fs.createWriteStream(imgPath);
        await new Promise((resolve, reject) => {
          response.data.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        imgPaths.push(imgPath);
      }

      const caption = `📄 Page: ${page}\n🎌 Cosplayer: ${result.cosplayer}\n🎭 Character: ${result.character}\n📚 Series: ${result.appearIn}\n🔗 Source: ${result.url}`;
      const attachments = imgPaths.map(file => fs.createReadStream(file));

      api.sendMessage(
        { body: caption, attachment: attachments },
        event.threadID,
        () => imgPaths.forEach(file => fs.unlinkSync(file)),
        event.messageID
      );

    } catch (error) {
      console.error("nc error:", error);
      return api.sendMessage("❌ Something went wrong.", event.threadID, event.messageID);
    }
  }
};