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
    titleKr: get("TITLE_KR"),
    year: get("YEAR"),
    genre: get("GENRE"),
    rating: get("RATING"),
    episodes: get("EPISODES"),
    network: get("NETWORK"),
    status: get("STATUS"),
    type: get("TYPE"),
    description: get("DESCRIPTION")
  };
}

async function getCover(title) {
  const sources = [
    async () => {
      const res = await axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`, { timeout: 8000 });
      return res.data?.[0]?.show?.image?.original || null;
    },
    async () => {
      const words = title.split(" ").slice(0, 3).join(" ");
      const res = await axios.get(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(words)}`, { timeout: 8000 });
      return res.data?.[0]?.show?.image?.original || null;
    }
  ];
  for (const src of sources) {
    try { const url = await src(); if (url) return url; } catch (_) {}
  }
  return null;
}

async function downloadImage(url) {
  try {
    fs.ensureDirSync(cacheDir);
    const imgPath = path.join(cacheDir, `kdrama_${Date.now()}.jpg`);
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
    const tmpPath = path.join(__dirname, "tmp", `kdep_${Date.now()}.mp4`);
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

const RANDOM_TYPES = [
  "دراما كورية رومانسية", "دراما كورية أكشن", "دراما كورية تاريخية",
  "دراما كورية غموض وإثارة", "دراما كورية كوميدية", "دراما كورية جريمة",
  "فيلم كوري رومانسي", "فيلم كوري رعب", "فيلم كوري أكشن", "دراما كورية طبية"
];

module.exports = {
  config: {
    name: "كيدراما",
    aliases: ["kdrama", "koreandrama", "دراما-كورية", "dramacorea", "كدراما"],
    version: "2.0",
    author: "Saint",
    countDown: 8,
    role: 0,
    shortDescription: "ابحث عن كي دراما أو فيلم كوري",
    longDescription: "ابحث عن دراما كورية أو فيلم كوري مع صورة الغلاف والنبذة، ويمكن طلب حلقة بعينها",
    category: "media",
    guide: "{pn} [اسم الدراما]\n{pn} [اسم الدراما] حلقة [رقم]\n{pn} — اقتراح عشوائي"
  },

  onStart: async function ({ api, event, args, message }) {
    const input = args.join(" ").trim();
    const apiKey = getApiKey();
    if (!apiKey) return message.reply("❌ لا يوجد مفتاح API. تواصل مع مطور البوت.");

    const epMatch = input.match(/(.+?)\s+حلقة\s+(\d+)/i) || input.match(/(.+?)\s+ep(?:isode)?\s+(\d+)/i);
    const isEpisode = !!epMatch;
    const dramaName = epMatch ? epMatch[1].trim() : input;
    const epNum = epMatch ? epMatch[2] : null;
    const isRandom = !input;

    if (isEpisode) {
      const waiting = await message.reply(`╭──────────────╮\n   🔍 أبحث عن الحلقة ${epNum} من "${dramaName}"...\n╰──────────────╯`);

      const fbQuery = `${dramaName} الحلقة ${epNum} مترجم عربي`;
      const ytQuery = `${dramaName} episode ${epNum} arabic sub`;

      const [fbResult, ytResult] = await Promise.allSettled([
        searchFacebookVideo(api, fbQuery),
        searchYoutubeVideo(ytQuery)
      ]);

      const fbUrl = fbResult.status === "fulfilled" ? fbResult.value : null;
      const ytData = ytResult.status === "fulfilled" ? ytResult.value : null;

      api.unsendMessage(waiting.messageID).catch(() => {});

      if (fbUrl) {
        return message.reply(`╭━━━━━━━━━━━━━━━━━╮\n   🇰🇷 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗞𝗗𝗿𝗮𝗺𝗮\n╰━━━━━━━━━━━━━━━━━╯\n\n✅ وجدت الحلقة على فيسبوك!\n📺 ${dramaName} — الحلقة ${epNum}\n\n🔗 ${fbUrl}\n\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`);
      }

      if (ytData) {
        const sent = await downloadAndSendVideo(message, ytData.streamUrl, `${dramaName} — الحلقة ${epNum}`, ytData.quality);
        if (sent) return;
        return message.reply(`╭━━━━━━━━━━━━━━━━━╮\n   🇰🇷 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗞𝗗𝗿𝗮𝗺𝗮\n╰━━━━━━━━━━━━━━━━━╯\n\n📺 ${dramaName} — الحلقة ${epNum}\n🎥 ${ytData.title}\n\n🔗 ${ytData.ytUrl}\n\n✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`);
      }

      return message.reply(`❌ لم أتمكن من إيجاد الحلقة ${epNum} من "${dramaName}"\nجرب كتابة اسم الدراما بالإنجليزي.`);
    }

    const waiting = await message.reply(isRandom
      ? "╭──────────────╮\n   🎲 جاري اختيار دراما كورية...\n╰──────────────╯"
      : "╭──────────────╮\n   🔍 جاري البحث...\n╰──────────────╯"
    );

    try {
      let rawText;
      if (isRandom) {
        const type = RANDOM_TYPES[Math.floor(Math.random() * RANDOM_TYPES.length)];
        rawText = await callGemini(apiKey, `اقترح ${type} واحد فقط، عشوائي وممتاز.
الرد بالشكل التالي فقط بدون أي إضافات:
TITLE_EN: (الاسم بالإنجليزية أو الرومانجي)
TITLE_AR: (الاسم بالعربية)
TITLE_KR: (الاسم بالكورية)
TYPE: (دراما | فيلم)
YEAR: (سنة الإصدار)
GENRE: (التصنيف بالعربية)
RATING: (التقييم من 10)
EPISODES: (عدد الحلقات إذا دراما، أو "فيلم")
NETWORK: (القناة أو منصة البث)
STATUS: (مكتمل | مستمر)
DESCRIPTION: (قصة الدراما في 4 أسطر بالعربية بدون حرق أحداث)`, 1.1);
      } else {
        rawText = await callGemini(apiKey, `أنت خبير دراما كورية. ابحث عن "${dramaName}" وأعطني معلوماته.
إذا لم تجده بالضبط، ابحث عن أقرب نتيجة كورية.
الرد بالشكل التالي فقط بدون أي إضافات:
TITLE_EN: (الاسم بالإنجليزية أو الرومانجي)
TITLE_AR: (الاسم بالعربية)
TITLE_KR: (الاسم بالكورية)
TYPE: (دراما | فيلم)
YEAR: (سنة الإصدار)
GENRE: (التصنيف بالعربية)
RATING: (التقييم من 10)
EPISODES: (عدد الحلقات إذا دراما، أو "فيلم")
NETWORK: (القناة أو منصة البث)
STATUS: (مكتمل | مستمر)
DESCRIPTION: (قصة الدراما في 4 أسطر بالعربية بدون حرق أحداث)`, 0.3);
      }

      if (!rawText) {
        api.unsendMessage(waiting.messageID).catch(() => {});
        return message.reply("❌ ما قدرت أجي بنتائج، جرب مرة أخرى.");
      }

      const info = parseInfo(rawText);
      if (!info.titleEn && !info.titleAr) {
        api.unsendMessage(waiting.messageID).catch(() => {});
        return message.reply(`❌ لم أجد دراما كورية بهذا الاسم: "${dramaName}"`);
      }

      const isFilm = info.type?.includes("فيلم");
      const body =
        `╭━━━━━━━━━━━━━━━━━╮\n` +
        `   🇰🇷 ⌯ 𝕭⃟𝗹⃪𝗮⃪𝗰⃪𝐤̰ 𝗞𝗗𝗿𝗮𝗺𝗮\n` +
        `╰━━━━━━━━━━━━━━━━━╯\n\n` +
        `${isFilm ? "🎬" : "📺"} ${info.titleAr || info.titleEn}\n` +
        (info.titleEn && info.titleAr ? `🔤 ${info.titleEn}\n` : "") +
        (info.titleKr ? `🔣 ${info.titleKr}\n` : "") +
        `📂 النوع: ${info.type || "دراما كورية"}\n` +
        `📅 سنة الإصدار: ${info.year}\n` +
        `🎭 التصنيف: ${info.genre}\n` +
        `⭐ التقييم: ${info.rating}/10\n` +
        (!isFilm && info.episodes ? `📺 الحلقات: ${info.episodes}\n` : "") +
        (info.network ? `📡 القناة: ${info.network}\n` : "") +
        `📊 الحالة: ${info.status}\n` +
        `\n📝 القصة:\n${info.description}\n` +
        (!isFilm ? `\n💡 للحلقات: .كيدراما ${info.titleEn || dramaName} حلقة [رقم]\n` : "") +
        `✎﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏﹏\n` +
        `↞ ⌯ 𝗕⃪𝗹⃪𝖆⃟𝗰⃪𝗸⃪ ˖՞𝗦⃪𝖆⃟𝗶⃪𝗻⃪𝘁⃪ ⪼`;

      api.unsendMessage(waiting.messageID).catch(() => {});
      await message.reply(body);

      const coverTitle = info.titleEn || info.titleAr || dramaName;
      const coverUrl = await getCover(coverTitle);
      if (coverUrl) {
        const imgData = await downloadImage(coverUrl);
        if (imgData) {
          message.reply({ body: "", attachment: [imgData.stream] }, () => {
            fs.remove(imgData.path).catch(() => {});
          });
        }
      }

    } catch (err) {
      console.error("[كيدراما]", err.message);
      api.unsendMessage(waiting.messageID).catch(() => {});
      message.reply("❌ حدث خطأ أثناء البحث، جرب مرة أخرى.");
    }
  }
};
