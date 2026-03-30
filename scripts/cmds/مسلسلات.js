const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const cacheDir = path.join(__dirname, "cache");

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.privacydev.net",
  "https://iv.datura.network"
];

function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "config.json"), "utf-8"));
    return cfg.apiKeys?.gemini || cfg.apiKeys?.groq || null;
  } catch (_) { return null; }
}

async function callGemini(apiKey, prompt, temperature = 0.3) {
  for (let i = 0; i <= 2; i++) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, maxOutputTokens: 600, thinkingConfig: { thinkingBudget: 0 } } },
        { headers: { "Content-Type": "application/json" }, timeout: 25000 }
      );
      return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (err) {
      if (err.response?.status === 429 && i < 2) {
        await new Promise(r => setTimeout(r, 18000));
        continue;
      }
      throw err;
    }
  }
}

function parseInfo(text) {
  const get = (key) => {
    const m = text.match(new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`, "i"));
    return m ? m[1].trim() : "";
  };
  return {
    titleEn: get("TITLE_EN"),
    titleAr: get("TITLE_AR"),
    year: get("YEAR"),
    genre: get("GENRE"),
    rating: get("RATING"),
    seasons: get("SEASONS"),
    episodes: get("EPISODES"),
    status: get("STATUS"),
    description: get("DESCRIPTION")
  };
}

async function getCover(title) {
  try {
    const res = await axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`, { timeout: 8000 });
    if (res.data?.[0]?.show?.image?.original) return res.data[0].show.image.original;
  } catch (_) {}
  try {
    const res = await axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title.split(" ").slice(0, 3).join(" "))}`, { timeout: 8000 });
    if (res.data?.[0]?.show?.image?.original) return res.data[0].show.image.original;
  } catch (_) {}
  return null;
}

async function downloadImage(url) {
  try {
    fs.ensureDirSync(cacheDir);
    const imgPath = path.join(cacheDir, `series_${Date.now()}.jpg`);
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 12000 });
    fs.writeFileSync(imgPath, Buffer.from(res.data));
    return { stream: fs.createReadStream(imgPath), path: imgPath };
  } catch (_) { return null; }
}

async function searchFacebookVideo(api, query) {
  try {
    const html = await api.httpGet(`https://www.facebook.com/search/videos/?q=${encodeURIComponent(query)}`);
    const idMatches = html.match(/"video_id":"(\d+)"/g) || html.match(/watch\?v=(\d{15,})/g);
    if (idMatches?.length) {
      const videoId = idMatches[0].match(/\d{10,}/)?.[0];
      if (videoId) return `https://www.facebook.com/watch?v=${videoId}`;
    }
  } catch (_) {}
  return null;
}

async function searchYoutubeVideo(query) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const searchRes = await axios.get(`${instance}/api/v1/search`, {
        params: { q: query, type: "video", sort_by: "relevance" }, timeout: 10000
      });
      if (!searchRes.data?.[0]) continue;
      const video = searchRes.data[0];
      const videoId = video.videoId;
      try {
        const infoRes = await axios.get(`${instance}/api/v1/videos/${videoId}`, { timeout: 10000 });
        const streams = infoRes.data?.formatStreams;
        if (streams?.length) {
          const lowQ = streams[streams.length - 1];
          return { title: video.title, ytUrl: `https://youtu.be/${videoId}`, streamUrl: lowQ.url, quality: lowQ.qualityLabel || "360p" };
        }
      } catch (_) {}
      return { title: video.title, ytUrl: `https://youtu.be/${videoId}`, streamUrl: null, quality: null };
    } catch (_) {}
  }
  return null;
}

async function downloadAndSendVideo(message, streamUrl, title, quality) {
  if (!streamUrl) return false;
  try {
    const head = await axios.head(streamUrl, { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } });
    const size = parseInt(head.headers["content-length"] || "0");
    if (size > 60 * 1024 * 1024) return false;
    fs.ensureDirSync(path.join(__dirname, "tmp"));
    const tmpPath = path.join(__dirname, "tmp", `ep_${Date.now()}.mp4`);
    const res = await axios.get(streamUrl, { responseType: "stream", timeout: 90000, headers: { "User-Agent": "Mozilla/5.0" } });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tmpPath);
      res.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    await message.reply({ body: `🎬 ${title} — ${quality}`, attachment: fs.createReadStream(tmpPath) });
    fs.remove(tmpPath).catch(() => {});
    return true;
  } catch (_) { return false; }
}

module.exports = {
  config: {
    name: "مسلسلات",
    aliases: ["series", "مسلسل", "mosalsalat", "مسلسل-حلقة"],
    version: "2.0",
    author: "Saint",
    countDown: 8,
    role: 0,
    shortDescription: "معلومات مسلسل + بحث حلقات",
    longDescription: "ابحث عن مسلسل وشاهد تفاصيله، أو اطلب حلقة بعينها للبحث عنها",
    category: "media",
    guide: "{pn} [اسم المسلسل]\n{pn} [اسم المسلسل] حلقة [رقم]"
  },

  onStart: async function ({ api, event, args, message }) {
    const input = args.join(" ").trim();
    if (!input) return message.reply("🎬 اكتب اسم المسلسل بعد الأمر.\nمثال: .مسلسلات breaking bad\nأو للحلقة: .مسلسلات breaking bad حلقة 5");

    const epMatch = input.match(/(.+?)\s+حلقة\s+(\d+)/i) || input.match(/(.+?)\s+ep(?:isode)?\s+(\d+)/i);
    const isEpisode = !!epMatch;
    const seriesName = epMatch ? epMatch[1].trim() : input;
    const epNum = epMatch ? epMatch[2] : null;

    const apiKey = getApiKey();
    if (!apiKey) return message.reply("❌ لا يوجد مفتاح API. تواصل مع مطور البوت.");

    if (isEpisode) {
      const waiting = await message.reply(`╭──────────────╮\n   🔍 أبحث عن الحلقة ${epNum} من "${seriesName}"...\n╰──────────────╯`);

      const fbQuery = `${seriesName} الحلقة ${epNum} مترجم`;
      const ytQuery = `${seriesName} episode ${epNum} مترجم عربي`;

      const [fbResult, ytResult] = await Promise.allSettled([
        searchFacebookVideo(api, fbQuery),
        searchYoutubeVideo(ytQuery)
      ]);

      const fbUrl = fbResult.status === "fulfilled" ? fbResult.value : null;
      const ytData = ytResult.status === "fulfilled" ? ytResult.value : null;

      api.unsendMessage(waiting.messageID).catch(() => {});

      if (fbUrl) {
        return message.reply(`╭━━━━━━━━━━━━━━━━━╮\n   🎬 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗦𝗲𝗿𝗶𝗲𝘀\n╰━━━━━━━━━━━━━━━━━╯\n\n✅ وجدت الحلقة على فيسبوك!\n📺 ${seriesName} — الحلقة ${epNum}\n\n🔗 ${fbUrl}\n\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`);
      }

      if (ytData) {
        const sent = await downloadAndSendVideo(message, ytData.streamUrl, `${seriesName} — الحلقة ${epNum}`, ytData.quality);
        if (sent) return;
        return message.reply(`╭━━━━━━━━━━━━━━━━━╮\n   🎬 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗦𝗲𝗿𝗶𝗲𝘀\n╰━━━━━━━━━━━━━━━━━╯\n\n📺 ${seriesName} — الحلقة ${epNum}\n🎥 ${ytData.title}\n\n🔗 ${ytData.ytUrl}\n\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`);
      }

      return message.reply(`❌ لم أتمكن من إيجاد الحلقة ${epNum} من "${seriesName}"\nجرب كتابة اسم المسلسل بالإنجليزي.`);
    }

    const waiting = await message.reply("╭──────────────╮\n   🔍 جاري البحث...\n╰──────────────╯");

    try {
      const prompt = `أنت خبير مسلسلات. ابحث عن مسلسل "${seriesName}" وأعطني معلوماته.
إذا لم تجده بالضبط، ابحث عن أقرب نتيجة.
الرد بالشكل التالي فقط بدون أي إضافات:
TITLE_EN: (الاسم بالإنجليزية)
TITLE_AR: (الاسم بالعربية)
YEAR: (سنة الإصدار)
GENRE: (التصنيف بالعربية)
RATING: (التقييم من 10)
SEASONS: (عدد المواسم)
EPISODES: (عدد الحلقات الإجمالي)
STATUS: (مكتمل | مستمر | متوقف)
DESCRIPTION: (قصة المسلسل في 4 أسطر بالعربية بدون حرق أحداث)`;

      const [rawText, coverUrl] = await Promise.allSettled([
        callGemini(apiKey, prompt, 0.3),
        getCover(seriesName)
      ]);

      const text = rawText.status === "fulfilled" ? rawText.value : null;
      if (!text) {
        api.unsendMessage(waiting.messageID).catch(() => {});
        return message.reply("❌ ما قدرت أجي بنتائج، جرب كتابة الاسم بالإنجليزي.");
      }

      const info = parseInfo(text);
      if (!info.titleEn && !info.titleAr) {
        api.unsendMessage(waiting.messageID).catch(() => {});
        return message.reply(`❌ لم أجد مسلسلاً بهذا الاسم: "${seriesName}"`);
      }

      const body =
        `╭━━━━━━━━━━━━━━━━━╮\n` +
        `   🎬 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗦𝗲𝗿𝗶𝗲𝘀\n` +
        `╰━━━━━━━━━━━━━━━━━╯\n\n` +
        `📺 ${info.titleAr || info.titleEn}\n` +
        (info.titleEn && info.titleAr ? `🔤 ${info.titleEn}\n` : "") +
        `📅 سنة الإصدار: ${info.year}\n` +
        `🎭 التصنيف: ${info.genre}\n` +
        `⭐ التقييم: ${info.rating}/10\n` +
        (info.seasons ? `📂 المواسم: ${info.seasons}\n` : "") +
        (info.episodes ? `📺 الحلقات: ${info.episodes}\n` : "") +
        `📊 الحالة: ${info.status}\n` +
        `\n📝 القصة:\n${info.description}\n` +
        `\n💡 للحلقات: .مسلسلات ${info.titleEn || seriesName} حلقة [رقم]\n` +
        `✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n` +
        `↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`;

      api.unsendMessage(waiting.messageID).catch(() => {});
      await message.reply(body);

      const coverUrlVal = coverUrl.status === "fulfilled" ? coverUrl.value : null;
      const searchTitle = info.titleEn || seriesName;
      let finalCover = coverUrlVal;
      if (!finalCover) finalCover = await getCover(searchTitle);

      if (finalCover) {
        const imgData = await downloadImage(finalCover);
        if (imgData) {
          message.reply({ body: "", attachment: [imgData.stream] }, () => {
            fs.remove(imgData.path).catch(() => {});
          });
        }
      }

    } catch (err) {
      console.error("[مسلسلات]", err.message);
      api.unsendMessage(waiting.messageID).catch(() => {});
      message.reply("❌ حدث خطأ أثناء البحث، جرب مرة أخرى.");
    }
  }
};
