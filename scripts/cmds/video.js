const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const ytSearch = require("yt-search");

const tmpDir = path.join(__dirname, "tmp");

const INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://invidious.privacydev.net",
  "https://iv.datura.network",
  "https://invidious.nerdvpn.de",
  "https://yt.drgnz.club"
];

function sendMsg(message, body) {
  return new Promise(resolve => message.reply(body, (err, info) => resolve(info?.messageID || null)));
}

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

async function getStreamUrl(videoId) {
  for (const instance of INVIDIOUS) {
    try {
      const res = await axios.get(`${instance}/api/v1/videos/${videoId}`, { timeout: 12000 });
      const streams = res.data?.formatStreams;
      if (!streams?.length) continue;
      const low = streams.find(s => s.qualityLabel === "360p")
        || streams.find(s => s.qualityLabel === "240p")
        || streams.find(s => s.qualityLabel === "144p")
        || streams[streams.length - 1];
      return { url: low.url, quality: low.qualityLabel || "360p", instance };
    } catch (_) {}
  }
  return null;
}

async function tryDownload(streamUrl, tmpPath) {
  try {
    const head = await axios.head(streamUrl, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } }).catch(() => null);
    const size = parseInt(head?.headers?.["content-length"] || "0");
    if (size > 60 * 1024 * 1024) return false;
  } catch (_) {}
  const res = await axios.get(streamUrl, { responseType: "stream", timeout: 120000, headers: { "User-Agent": "Mozilla/5.0" } });
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(tmpPath);
    res.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  const stat = await fs.stat(tmpPath).catch(() => null);
  if (!stat || stat.size < 1000) {
    await fs.remove(tmpPath).catch(() => {});
    return false;
  }
  return true;
}

async function downloadWithRetry(videoId, fileName) {
  fs.ensureDirSync(tmpDir);
  const tmpPath = path.join(tmpDir, fileName);

  for (const instance of INVIDIOUS) {
    try {
      const res = await axios.get(`${instance}/api/v1/videos/${videoId}`, { timeout: 12000 });
      const streams = res.data?.formatStreams;
      if (!streams?.length) continue;

      const priorities = ["360p", "240p", "144p", "720p"];
      const sorted = [];
      for (const q of priorities) {
        const found = streams.find(s => s.qualityLabel === q);
        if (found) sorted.push(found);
      }
      for (const s of streams) {
        if (!sorted.includes(s)) sorted.push(s);
      }

      for (const stream of sorted) {
        try {
          const ok = await tryDownload(stream.url, tmpPath);
          if (ok) return { path: tmpPath, quality: stream.qualityLabel || "360p" };
        } catch (_) {
          await fs.remove(tmpPath).catch(() => {});
        }
      }
    } catch (_) {}
  }
  return null;
}

module.exports = {
  config: {
    name: "فيديو",
    aliases: ["v", "video", "دونلواد", "يوتيوب", "yt"],
    version: "2.1",
    author: "Saint",
    countDown: 8,
    role: 0,
    shortDescription: "بحث وتحميل فيديو من يوتيوب",
    longDescription: "ابحث عن فيديو أو أغنية من يوتيوب بالاسم وسيتم تحميله وإرساله مباشرة",
    category: "media",
    guide: "{pn} [اسم الفيديو أو الأغنية]"
  },

  onStart: async function ({ api, event, args, message }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("🔍 اكتب اسم الفيديو أو الأغنية بعد الأمر.\nمثال: .فيديو despacito\nمثال: .فيديو اغنية حزينة");

    const waitingID = await sendMsg(message, "◈ ↞جاري البحث..〔 ! 〕\n◈ 𝗕⃪𝗹𝗮𝗰⃪𝗸 : 𝗠⃪𝗮⃪𝗵⃪𝗼𝗿𝗮⃪\n━━━━━━━━━━━━━");

    function unsendWaiting() {
      if (waitingID) api.unsendMessage(waitingID).catch(() => {});
    }

    try {
      const results = await ytSearch(query);
      if (!results?.videos?.length) {
        unsendWaiting();
        return message.reply(`❌ لم أجد نتائج لـ "${query}"\nجرب كتابة اسم آخر.`);
      }

      const candidates = results.videos.slice(0, 5);
      let downloaded = null;
      let chosenVideo = null;

      for (const video of candidates) {
        const fileName = `yt_${Date.now()}.mp4`;
        const result = await downloadWithRetry(video.videoId, fileName);
        if (result) {
          downloaded = result;
          chosenVideo = video;
          break;
        }
      }

      unsendWaiting();

      if (!downloaded || !chosenVideo) {
        return message.reply(`❌ تعذر تنزيل الفيديو، جرب كلمات بحث مختلفة.`);
      }

      const body =
        `╭━━━━━━━━━━━━━━━━━╮\n` +
        `   🎬 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗩𝗶𝗱𝗲𝗼\n` +
        `╰━━━━━━━━━━━━━━━━━╯\n\n` +
        `📌 ${chosenVideo.title}\n` +
        `📺 القناة: ${chosenVideo.author.name}\n` +
        `⏱ المدة: ${chosenVideo.timestamp}\n` +
        `👁 المشاهدات: ${formatViews(chosenVideo.views)}\n` +
        `📊 الجودة: ${downloaded.quality}\n` +
        `🔗 https://youtu.be/${chosenVideo.videoId}\n` +
        `\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n` +
        `↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`;

      message.reply({ body, attachment: fs.createReadStream(downloaded.path) }, () => {
        fs.remove(downloaded.path).catch(() => {});
      });

    } catch (err) {
      console.error("[فيديو]", err.message);
      unsendWaiting();
      message.reply("❌ حدث خطأ أثناء البحث أو التحميل، جرب مرة أخرى.");
    }
  }
};
